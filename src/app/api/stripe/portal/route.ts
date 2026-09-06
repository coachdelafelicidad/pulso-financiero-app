import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, getStripe, stripeRuntimeInfo } from "@/lib/stripe";

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
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No encontramos un cliente de Stripe en tu cuenta." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appOrigin()}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("[stripe/portal]", error);
    return NextResponse.json(
      {
        error:
          "No se pudo abrir el portal de Stripe. Activa Customer Portal en el Dashboard de Stripe o escribe a hola@okomosfinanzas.com.",
      },
      { status: 500 }
    );
  }
}
