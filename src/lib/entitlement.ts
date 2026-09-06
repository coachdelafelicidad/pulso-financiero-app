import type { SupabaseClient } from "@supabase/supabase-js";

export type Entitlement = {
  isPremium: boolean;
  isVip: boolean;
  scoreCount: number;
  stripeCustomerId: string | null;
  canCapture: boolean;
  canUsePremiumTools: boolean;
};

/** Equipo, familia y cuentas internas: acceso completo aunque falle Supabase. */
export const TEAM_VIP_EMAILS = new Set([
  "mario.mojica@gmail.com",
  "mario_mojica@hotmail.com",
  "anaosorno@hotmail.com",
  "anaosornopulido@gmail.com",
  "lacoachdelafelicidad@gmail.com",
  "diego.mojica@gmail.com",
  "diego_mojica@hotmail.com",
]);

export function normalizeEmail(email?: string | null): string {
  return (email ?? "").trim().toLowerCase();
}

export function isVipAllowlisted(email?: string | null): boolean {
  return TEAM_VIP_EMAILS.has(normalizeEmail(email));
}

export function buildEntitlement(input: {
  isPremium: boolean;
  isVip: boolean;
  scoreCount: number;
  stripeCustomerId?: string | null;
}): Entitlement {
  const unlocked = input.isPremium || input.isVip;
  return {
    isPremium: input.isPremium,
    isVip: input.isVip,
    scoreCount: input.scoreCount,
    stripeCustomerId: input.stripeCustomerId ?? null,
    canCapture: unlocked || input.scoreCount === 0,
    canUsePremiumTools: unlocked,
  };
}

export async function fetchEntitlement(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<Entitlement> {
  const email = user.email?.trim() ?? "";
  const listed = isVipAllowlisted(email);

  try {
    const [profileRes, vipRpc, vipRow, countRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("subscription_status, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle()
        .then((res) => res)
        .catch(() => ({ data: null })),
      supabase
        .rpc("is_current_user_vip")
        .then((res) => res)
        .catch(() => ({ data: null })),
      email
        ? supabase
            .from("vip_emails")
            .select("email")
            .ilike("email", email)
            .maybeSingle()
            .then((res) => res)
            .catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      supabase
        .from("pulso_scores")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then((res) => res)
        .catch(() => ({ count: 0 })),
    ]);

    return buildEntitlement({
      isPremium: profileRes.data?.subscription_status === "active",
      isVip: listed || vipRpc.data === true || Boolean(vipRow.data?.email),
      scoreCount: countRes.count ?? 0,
      stripeCustomerId: profileRes.data?.stripe_customer_id ?? null,
    });
  } catch {
    return buildEntitlement({
      isPremium: false,
      isVip: listed,
      scoreCount: listed ? 0 : 1,
    });
  }
}
