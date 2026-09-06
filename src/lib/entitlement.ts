import type { SupabaseClient } from "@supabase/supabase-js";

export type Entitlement = {
  isPremium: boolean;
  isVip: boolean;
  scoreCount: number;
  stripeCustomerId: string | null;
  canCapture: boolean;
  canUsePremiumTools: boolean;
};

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

  const [profileRes, vipRpc, vipRow, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("is_current_user_vip"),
    email
      ? supabase.from("vip_emails").select("email").ilike("email", email).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("pulso_scores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  return buildEntitlement({
    isPremium: profileRes.data?.subscription_status === "active",
    isVip: vipRpc.data === true || Boolean(vipRow.data?.email),
    scoreCount: countRes.count ?? 0,
    stripeCustomerId: profileRes.data?.stripe_customer_id ?? null,
  });
}
