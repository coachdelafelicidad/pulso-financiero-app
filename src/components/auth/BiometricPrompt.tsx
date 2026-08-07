"use client";

import { useState } from "react";
import { createClient, syncSessionToCookies } from "@/lib/supabase/client";
import { registerPasskey, getBiometricLabel, isPlatformAuthenticatorAvailable } from "@/lib/auth/webauthn-client";
import { BIOMETRIC_EMAIL_KEY, BIOMETRIC_PREF_KEY } from "@/lib/auth/session-config";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Props = {
  email: string;
  onDismiss: () => void;
  onEnabled?: () => void;
};

export function BiometricPrompt({ email, onDismiss, onEnabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = getBiometricLabel();
  const { t } = useLanguage();

  async function handleEnable() {
    setLoading(true);
    setError(null);

    try {
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) {
        setError(t('bio.error_setup'));
        setLoading(false);
        return;
      }

      await syncSessionToCookies();

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const optionsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceName: label }),
      });
      const optionsPayload = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsPayload.error || t('bio.error_options'));
        setLoading(false);
        return;
      }

      const attestation = await registerPasskey(optionsPayload.options);

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers,
        body: JSON.stringify({ response: attestation, deviceName: label }),
      });
      const verifyPayload = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyPayload.error || t('bio.error_register'));
        setLoading(false);
        return;
      }

      localStorage.setItem(BIOMETRIC_PREF_KEY, "enabled");
      localStorage.setItem(BIOMETRIC_EMAIL_KEY, email.trim().toLowerCase());
      onEnabled?.();
      onDismiss();
    } catch {
      setError(t('bio.reg_cancelled'));
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(BIOMETRIC_PREF_KEY, "dismissed");
    onDismiss();
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-[16px] border border-[#06403C]/20 bg-white px-5 py-4 shadow-[0_14px_34px_-24px_rgba(6,64,60,0.35)]">
      <div>
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7DC242]">
          {t('bio.prompt_badge')}
        </div>
        <p className="font-poppins text-[15px] font-medium text-[#06403C]">
          {t('bio.prompt_title')} {label}?
        </p>
        <p className="mt-1 max-w-[520px] text-[13.5px] leading-relaxed text-black/55">
          {t('bio.prompt_body')}
        </p>
        {error && (
          <p className="mt-2 text-[13px] text-[#D45D5D]">{error}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-[#06403C] px-5 py-2.5 font-poppins text-[13px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {loading ? t('bio.configuring') : `${t('bio.activate')} ${label}`}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={loading}
            className="rounded-full px-4 py-2.5 text-[13px] font-medium text-black/55 transition hover:text-[#06403C]"
          >
            {t('bio.not_now')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.close')}
        className="shrink-0 text-[18px] leading-none text-black/35 transition hover:text-[#06403C]"
      >
        ✕
      </button>
    </div>
  );
}
