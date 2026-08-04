#!/usr/bin/env node
/**
 * Sincroniza SMTP de Supabase Auth con Resend usando RESEND_API_KEY.
 *
 * Uso:
 *   RESEND_API_KEY=re_... SUPABASE_ACCESS_TOKEN=sbp_... node scripts/sync-supabase-smtp.mjs
 *
 * También lee .env.local en la raíz del proyecto (RESEND_API_KEY, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF).
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(envPath);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_ACCESS_TOKEN =
  process.env.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_PAT;
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? "xnyndxlqjpiwcsdxmwwg";

const SMTP_ADMIN_EMAIL =
  process.env.SMTP_ADMIN_EMAIL ?? "hola@okomosfinanzas.com";
const SMTP_SENDER_NAME =
  process.env.SMTP_SENDER_NAME ?? "Pulso Financiero by Okomos Finanzas";

if (!RESEND_API_KEY) {
  console.error(
    "Falta RESEND_API_KEY. Agrégala a .env.local o expórtala en el shell.",
  );
  process.exit(1);
}

if (!RESEND_API_KEY.startsWith("re_")) {
  console.error(
    "RESEND_API_KEY debe ser la API key de Resend (prefijo re_).",
  );
  process.exit(1);
}

if (!SUPABASE_ACCESS_TOKEN) {
  console.error(
    "Falta SUPABASE_ACCESS_TOKEN (Personal Access Token de Supabase).",
  );
  process.exit(1);
}

const payload = {
  external_email_enabled: true,
  smtp_host: "smtp.resend.com",
  smtp_port: "587",
  smtp_user: "resend",
  smtp_pass: RESEND_API_KEY,
  smtp_admin_email: SMTP_ADMIN_EMAIL,
  smtp_sender_name: SMTP_SENDER_NAME,
};

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  },
);

if (!res.ok) {
  const body = await res.text();
  console.error(`Error ${res.status} al actualizar SMTP:\n${body}`);
  process.exit(1);
}

const updated = await res.json();
console.log("SMTP Resend configurado en Supabase Auth:");
console.log(`  host: ${updated.smtp_host}`);
console.log(`  port: ${updated.smtp_port}`);
console.log(`  user: ${updated.smtp_user}`);
console.log(`  from: ${updated.smtp_sender_name} <${updated.smtp_admin_email}>`);
console.log(`  pass: ${String(updated.smtp_pass).slice(0, 8)}… (enmascarado)`);
