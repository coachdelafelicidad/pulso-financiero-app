import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeRuntimeInfo } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activateProfileSubscription } from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const runtime = stripeRuntimeInfo();
    if (!runtime.ok) {
      return NextResponse.json({ error: runtime.message }, { status: 503 });
    }

    const stripe = getStripe();
    const admin = getSupabaseAdmin();
    if (!stripe || !admin) {
      return NextResponse.json({ error: "Stripe o Supabase admin no disponible." }, { status: 503 });
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 10 });

    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 5,
      });

      const active = subscriptions.data.find(
        (sub) => sub.status === "active" || sub.status === "trialing"
      );

      if (active) {
        await activateProfileSubscription(admin, user.id, customer.id, active.id);
        return NextResponse.json({ ok: true, matched: true, subscription_status: "active" });
      }
    }

    return NextResponse.json({ ok: true, matched: false });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al reconciliar pago";
    console.error("[stripe/reconcile]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
