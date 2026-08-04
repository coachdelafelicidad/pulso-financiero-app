import Stripe from "stripe";

const TEST_SECRET_PREFIX = "sk_test_";
const TEST_PUBLISHABLE_PREFIX = "pk_test_";

// Fallback keys read from environment — never hardcode secrets in source
export const PINNED_STRIPE_TEST_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY_TEST_FALLBACK ?? "";

export const PINNED_STRIPE_TEST_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST_FALLBACK ?? "";

export type StripeConfigResult =
  | {
      ok: true;
      secretKey: string;
      publishableKey: string;
      priceId: string | null;
      forcedTestKeys: boolean;
    }
  | { ok: false; message: string };

let stripeClient: Stripe | null = null;
let stripeClientKey: string | null = null;

function resolveTestSecretKey(): { secretKey: string; forced: boolean } {
  const envSecret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";

  if (envSecret.startsWith(TEST_SECRET_PREFIX)) {
    return { secretKey: envSecret, forced: false };
  }

  if (envSecret.startsWith("sk_live_")) {
    console.warn(
      "[stripe] STRIPE_SECRET_KEY es sk_live_; forzando claves sk_test_ fijadas.",
    );
  } else if (envSecret) {
    console.warn("[stripe] STRIPE_SECRET_KEY inválida; forzando sk_test_ fijada.");
  }

  return { secretKey: PINNED_STRIPE_TEST_SECRET_KEY, forced: true };
}

function resolveTestPublishableKey(forced: boolean): string {
  const envPublishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

  if (!forced && envPublishable.startsWith(TEST_PUBLISHABLE_PREFIX)) {
    return envPublishable;
  }

  if (envPublishable.startsWith("pk_live_")) {
    console.warn(
      "[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY es pk_live_; forzando pk_test_ fijada.",
    );
  }

  return PINNED_STRIPE_TEST_PUBLISHABLE_KEY;
}

export function validateStripeTestConfig(): StripeConfigResult {
  const { secretKey, forced } = resolveTestSecretKey();
  const publishableKey = resolveTestPublishableKey(forced);

  // Solo aceptamos price IDs explícitos de test para evitar mezclar objetos Live.
  const priceId =
    process.env.STRIPE_TEST_PRICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_STRIPE_TEST_PRICE_ID?.trim() ||
    null;

  return { ok: true, secretKey, publishableKey, priceId, forcedTestKeys: forced };
}

export function getStripe(): Stripe | null {
  const config = validateStripeTestConfig();
  if (!config.ok) return null;

  if (!stripeClient || stripeClientKey !== config.secretKey) {
    stripeClient = new Stripe(config.secretKey, {
      apiVersion: "2026-06-24.dahlia",
    });
    stripeClientKey = config.secretKey;
  }

  return stripeClient;
}

export function stripeConfigError(): string | null {
  const config = validateStripeTestConfig();
  return config.ok ? null : config.message;
}

export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "https://app.pulsofinanciero.okomosfinanzas.com";
}

export function stripePriceId(): string | null {
  const config = validateStripeTestConfig();
  return config.ok ? config.priceId : null;
}

export function isStripeTestMode(): boolean {
  return validateStripeTestConfig().ok;
}

export function stripeRuntimeInfo() {
  const config = validateStripeTestConfig();
  if (!config.ok) return { ok: false as const, message: config.message };

  return {
    ok: true as const,
    mode: "test" as const,
    forcedTestKeys: config.forcedTestKeys,
    secretPrefix: config.secretKey.slice(0, 12),
    publishablePrefix: config.publishableKey.slice(0, 12),
  };
}
