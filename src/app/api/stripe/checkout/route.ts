import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PINNED_STRIPE_TEST_SECRET_KEY,
  appOrigin,
  stripePriceId,
  stripeRuntimeInfo,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCheckoutStripe(): Stripe {
  // Checkout siempre usa sk_test_ fijada para evitar Live Mode en producción.
  return new Stripe(PINNED_STRIPE_TEST_SECRET_KEY, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export async function POST() {
  try {
    const runtime = stripeRuntimeInfo();
    if (!runtime.ok) {
      return NextResponse.json(
        { error: runtime.message, stripeMode: "test_required" },
        { status: 503 },
      );
    }

    const stripe = getCheckoutStripe();

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const origin = appOrigin();
    const priceId = stripePriceId();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "mxn",
                product_data: {
                  name: "Pulso Financiero Premium",
                  description: "Tablero ejecutivo, captura semanal y simulador de tesorería",
                },
                unit_amount: 49900,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
      metadata: {
        userId: user.id,
        stripeMode: "test",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/quiz?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No se pudo crear la sesión de Stripe Checkout." },
        { status: 500 }
      );
    }

    const testMode = session.livemode === false;

    return NextResponse.json({
      url: session.url,
      stripeMode: testMode ? "test" : "live",
      sessionId: session.id,
      forcedTestKeys: runtime.forcedTestKeys,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear checkout";
    console.error("[stripe/checkout]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
