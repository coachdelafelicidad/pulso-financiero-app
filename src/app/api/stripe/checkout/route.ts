import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, getStripe, stripePriceId, stripeRuntimeInfo } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
    }

    const runtime = stripeRuntimeInfo();
    if (!runtime.ok) {
      return NextResponse.json({ error: runtime.message }, { status: 503 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe no disponible." }, { status: 503 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.subscription_status === "active") {
      return NextResponse.json({ error: "Tu suscripción ya está activa." }, { status: 409 });
    }

    const origin = appOrigin();
    const priceId = stripePriceId();
    const existingCustomer = profile?.stripe_customer_id ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: existingCustomer,
      customer_email: existingCustomer ? undefined : user.email ?? undefined,
      client_reference_id: user.id,
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "mxn",
                product_data: {
                  name: "Pulso by Okomos",
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
        stripeMode: runtime.mode,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?checkout=cancelled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "No se pudo crear la sesión de Stripe Checkout." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
      stripeMode: runtime.mode,
      sessionId: session.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear checkout";
    console.error("[stripe/checkout]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
