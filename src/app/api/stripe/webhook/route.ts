import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, stripeConfigError } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function POST(request: NextRequest) {
  const configError = stripeConfigError();
  if (configError) {
    return NextResponse.json({ error: configError, stripeMode: "test_required" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe Test Mode no disponible." }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin no configurado." }, { status: 503 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId || session.client_reference_id;
      if (!userId) break;

      const custId = customerId(session.customer);
      const subId = subscriptionId(session.subscription);

      await admin
        .from("profiles")
        .update({
          subscription_status: "active",
          stripe_customer_id: custId,
          stripe_subscription_id: subId,
          subscribed_at: new Date().toISOString(),
        })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      const cust = customerId(subscription.customer);

      let targetUserId = userId;
      if (!targetUserId && cust) {
        const { data } = await admin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", cust)
          .maybeSingle();
        targetUserId = data?.id;
      }

      if (targetUserId) {
        await admin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("id", targetUserId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
