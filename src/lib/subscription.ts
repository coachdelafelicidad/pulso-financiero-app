import type { SupabaseClient } from "@supabase/supabase-js";

export async function activateProfileSubscription(
  admin: SupabaseClient,
  userId: string,
  customerId: string | null,
  subscriptionId: string | null
) {
  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: "active",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscribed_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await admin.rpc("get_auth_user_id_by_email", {
    p_email: normalized,
  });

  if (error || !data) return null;
  return typeof data === "string" ? data : null;
}
