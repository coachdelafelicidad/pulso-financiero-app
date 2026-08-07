"use client";

import { useEffect, useState } from "react";
import { createClient, syncSessionToCookies } from "@/lib/supabase/client";
import {
  authenticatePasskey,
  getBiometricLabel,
  isPlatformAuthenticatorAvailable,
} from "@/lib/auth/webauthn-client";
import { BIOMETRIC_EMAIL_KEY } from "@/lib/auth/session-config";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Props = {
  email: string;
  onSuccess: () => void;
  onError: (message: string) => void;
};

function BiometricIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 11c1.66 0 3-1.34 3-3S13.66 5 12 5 9 6.34 9 8s1.34 3 3 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M6.5 20c.86-2.5 3.03-4 5.5-4s4.64 1.5 5.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4 12c1.2-3.2 4.2-5 8-5s6.8 1.8 8 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M2 8c1.6-4 5.4-6 10-6s8.4 2 10 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BiometricLoginButton({ email, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const label = getBiometricLabel();
  const { t } = useLanguage();

  async function handleBiometricLogin() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      onError(t('bio.error_start'));
      return;
    }

    setLoading(true);
    try {
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) {
        onError(t('bio.no_support'));
        return;
      }

      const statusRes = await fetch(
        `/api/auth/webauthn/status?email=${encodeURIComponent(normalized)}`
      );
      const status = await statusRes.json();
      if (!status.hasPasskey) {
        onError(t('bio.not_registered'));
        return;
      }

      const optionsRes = await fetch("/api/auth/webauthn/login-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const optionsPayload = await optionsRes.json();
      if (!optionsRes.ok) {
        onError(optionsPayload.error || t('bio.error_start'));
        return;
      }

      const assertion = await authenticatePasskey(optionsPayload.options);

      const verifyRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, response: assertion }),
      });
      const verifyPayload = await verifyRes.json();
      if (!verifyRes.ok) {
        onError(verifyPayload.error || t('bio.error_verify'));
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: verifyPayload.token_hash,
        type: "email",
      });

      if (error) {
        onError(t('bio.error_session'));
        return;
      }

      localStorage.setItem(BIOMETRIC_EMAIL_KEY, normalized);
      await syncSessionToCookies();
      onSuccess();
    } catch {
      onError(t('bio.cancelled'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBiometricLogin}
      disabled={loading || !email.trim()}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-[#06403C] bg-white px-5 py-3 font-poppins text-[14px] font-medium text-[#06403C] transition hover:border-[#9AD9CF] hover:bg-[#06403C]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <BiometricIcon />
      {loading ? t('bio.verifying') : `${t('bio.login_with')} ${label}`}
    </button>
  );
}

export function useBiometricLoginAvailability(email: string) {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      const normalized = email.trim().toLowerCase();
      if (!normalized) {
        if (active) setShowButton(false);
        return;
      }

      const platformOk = await isPlatformAuthenticatorAvailable();
      if (!platformOk) {
        if (active) setShowButton(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/webauthn/status?email=${encodeURIComponent(normalized)}`
        );
        const data = await res.json();
        if (active) setShowButton(Boolean(data.hasPasskey));
      } catch {
        if (active) setShowButton(false);
      }
    }

    void check();
    return () => {
      active = false;
    };
  }, [email]);

  return showButton;
}
