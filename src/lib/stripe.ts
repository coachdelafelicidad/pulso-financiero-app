import Stripe from "stripe";

export type StripeConfigResult =
  | {
      ok: true;
      secretKey: string;
      publishableKey: string;
      priceId: string | null;
      mode: "live" | "test";
    }
  | { ok: false; message: string };

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

/**
 * Resuelve la configuración de Stripe a partir de las llaves reales del
 * entorno — el modo (live/test) lo determina el prefijo de la llave
 * configurada, nunca un valor fijo en código. Así, poner llaves sk_live_ /
 * pk_live_ en producción activa cobros reales sin tocar el código.
 */
export function resolveStripeConfig(): StripeConfigResult {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!secretKey || !publishableKey) {
    return {
      ok: false,
      message: "Stripe no está configurado (faltan STRIPE_SECRET_KEY o NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).",
    };
  }

  const secretIsLive = secretKey.startsWith("sk_live_");
  const secretIsTest = secretKey.startsWith("sk_test_");
  const pubIsLive = publishableKey.startsWith("pk_live_");
  const pubIsTest = publishableKey.startsWith("pk_test_");

  if (!secretIsLive && !secretIsTest) {
    return { ok: false, message: "STRIPE_SECRET_KEY inválida: debe empezar con sk_live_ o sk_test_." };
  }
  if (!pubIsLive && !pubIsTest) {
    return {
      ok: false,
      message: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY inválida: debe empezar con pk_live_ o pk_test_.",
    };
  }
  if (secretIsLive !== pubIsLive) {
    return {
      ok: false,
      message: "STRIPE_SECRET_KEY y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no coinciden en modo (una es live y la otra test).",
    };
  }

  const mode: "live" | "test" = secretIsLive ? "live" : "test";
  const priceId =
    (mode === "live"
      ? process.env.STRIPE_PRICE_ID?.trim() || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim()
      : process.env.STRIPE_TEST_PRICE_ID?.trim() || process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID?.trim()) || null;

  return { ok: true, secretKey, publishableKey, priceId, mode };
}

export function getStripe(): Stripe | null {
  const config = resolveStripeConfig();
  if (!config.ok) return null;

  if (!config.secretKey) return null;

  if (!stripeClient || stripeClientKey !== config.secretKey) {
    try {
      stripeClient = new Stripe(config.secretKey, {
        apiVersion: "2026-06-24.dahlia",
      });
      stripeClientKey = config.secretKey;
    } catch {
      stripeClient = null;
      stripeClientKey = null;
      return null;
    }
  }

  return stripeClient;
}

export function stripeConfigError(): string | null {
  const config = resolveStripeConfig();
  return config.ok ? null : config.message;
}

export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "https://app.okomosfinanzas.com";
}

export function stripePriceId(): string | null {
  const config = resolveStripeConfig();
  return config.ok ? config.priceId : null;
}

export function stripeRuntimeInfo() {
  const config = resolveStripeConfig();
  if (!config.ok) return { ok: false as const, message: config.message };

  return {
    ok: true as const,
    mode: config.mode,
    secretPrefix: config.secretKey.slice(0, 12),
    publishablePrefix: config.publishableKey.slice(0, 12),
  };
}
