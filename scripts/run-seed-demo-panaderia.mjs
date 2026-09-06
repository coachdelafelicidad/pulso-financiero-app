import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

function loadEnv() {
  const out = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in out)) out[key] = value;
    }
  } catch {
    // usa solo process.env
  }
  return out;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EMAIL = "demo.panaderia@okomosfinanzas.com";
const PASSWORD = env.DEMO_PANADERIA_PASSWORD || "TrigoDemo2026!";

const generated = spawnSync(process.execPath, ["scripts/seed-demo-panaderia.mjs"], {
  encoding: "utf8",
});
if (generated.status !== 0) {
  console.error(generated.stderr);
  process.exit(generated.status ?? 1);
}

const rows = JSON.parse(generated.stdout);

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
let user = existing.users.find((u) => u.email?.toLowerCase() === EMAIL);

if (!user) {
  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      business_name: "Panadería El Trigo",
      full_name: "Demo El Trigo",
    },
  });
  if (created.error || !created.data.user) {
    console.error(created.error);
    process.exit(1);
  }
  user = created.data.user;
} else {
  const updated = await admin.auth.admin.updateUserById(user.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      business_name: "Panadería El Trigo",
      full_name: "Demo El Trigo",
    },
  });
  if (updated.error) {
    console.error(updated.error);
    process.exit(1);
  }
}

const { error: profileError } = await admin
  .from("profiles")
  .upsert({
    id: user.id,
    business_name: "Panadería El Trigo",
    subscription_status: "free",
  });
if (profileError) {
  console.error(profileError);
  process.exit(1);
}

const { error: vipError } = await admin.from("vip_emails").upsert(
  {
    email: EMAIL,
    nota: "Demo interno — Panadería El Trigo",
  },
  { onConflict: "email" }
);
if (vipError) {
  console.error(vipError);
  process.exit(1);
}

await admin.from("pulso_scores").delete().eq("user_id", user.id);

const payload = rows.map((r) => ({ ...r, user_id: user.id }));
const { error: scoreError } = await admin.from("pulso_scores").insert(payload);
if (scoreError) {
  console.error(scoreError);
  process.exit(1);
}

console.log(`OK demo ${EMAIL} semanas=${rows.length} user=${user.id}`);
