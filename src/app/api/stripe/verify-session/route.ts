import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe, stripeConfigError } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function customerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (typeof customer === "string") return customer;
  if (customer && "id" in customer) return customer.id;
  return null;
}

function subscriptionId(
  subscription: string | Stripe.Subscription | null
): string | null {
  if (typeof subscription === "string") return subscription;
  if (subscription && "id" in subscription) return subscription.id;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const configError = stripeConfigError();
    if (configError) {
      return NextResponse.json({ error: configError, stripeMode: "test_required" }, { status: 503 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe Test Mode no disponible." }, { status: 503 });
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Falta session_id." }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "El pago no está confirmado." }, { status: 402 });
    }

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (sessionUserId !== user.id) {
      return NextResponse.json({ error: "Sesión no válida para este usuario." }, { status: 403 });
    }

    const custId = customerId(session.customer);
    const subId = subscriptionId(session.subscription);

    const { error: rpcError } = await supabase.rpc("activate_subscription", {
      p_user_id: user.id,
      p_customer_id: custId,
      p_subscription_id: subId,
    });

    if (rpcError) {
      console.error("[stripe/verify-session] RPC error:", rpcError);
      return NextResponse.json({ error: "No se pudo activar la suscripción." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      subscription_status: "active",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al verificar sesión";
    console.error("[stripe/verify-session]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
