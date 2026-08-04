import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerPasskey(options: PublicKeyCredentialCreationOptionsJSON) {
  return startRegistration({ optionsJSON: options });
}

export async function authenticatePasskey(options: PublicKeyCredentialRequestOptionsJSON) {
  return startAuthentication({ optionsJSON: options });
}

export function getBiometricLabel(): string {
  if (typeof navigator === "undefined") return "Biometría";

  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "Face ID / Touch ID";
  if (/Mac OS X/.test(ua)) return "Touch ID";
  if (/Android/.test(ua)) return "Huella digital";
  if (/Windows/.test(ua)) return "Windows Hello";
  return "Face ID / Huella digital";
}
