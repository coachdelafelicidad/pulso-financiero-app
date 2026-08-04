/** Configuración WebAuthn / Passkeys para Pulso Financiero */

export function getWebAuthnRpId(): string {
  const configured = process.env.WEBAUTHN_RP_ID?.trim();
  if (configured) return configured;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://app.okomosfinanzas.com";
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return "app.okomosfinanzas.com";
  }
}

export function getWebAuthnOrigin(): string {
  const configured = process.env.WEBAUTHN_ORIGIN?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "https://app.okomosfinanzas.com";
}

export const WEBAUTHN_RP_NAME = "Tu Pulso · Okomos";

export const CHALLENGE_COOKIE = "pulso-webauthn-challenge";
export const CHALLENGE_TTL_SECONDS = 5 * 60;
