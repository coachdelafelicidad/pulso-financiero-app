"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, syncSessionToCookies } from "@/lib/supabase/client";
import {
  registerPasskey,
  getBiometricLabel,
  isPlatformAuthenticatorAvailable,
} from "@/lib/auth/webauthn-client";
import { BIOMETRIC_EMAIL_KEY, BIOMETRIC_PREF_KEY } from "@/lib/auth/session-config";

type Credential = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
  transports: string[] | null;
};

type Props = {
  email: string;
  onClose: () => void;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PasskeyManager({ email, onClose }: Props) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const label = getBiometricLabel();

  const fetchCredentials = useCallback(async () => {
    setLoadingList(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/auth/webauthn/credentials", { headers });
      const data = await res.json();
      setCredentials(data.credentials ?? []);
    } catch {
      setError("No se pudo cargar la lista de dispositivos.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  async function handleAddPasskey() {
    setError(null);
    setSuccess(null);
    setAddingNew(true);

    try {
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) {
        setError("Este dispositivo no soporta Face ID, Touch ID o huella digital.");
        return;
      }

      await syncSessionToCookies();
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const optionsRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers,
        body: JSON.stringify({ deviceName: label }),
      });
      const optionsPayload = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(optionsPayload.error || "No se pudo preparar el registro.");
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
        setError(verifyPayload.error || "No se pudo registrar la biometría.");
        return;
      }

      localStorage.setItem(BIOMETRIC_PREF_KEY, "enabled");
      localStorage.setItem(BIOMETRIC_EMAIL_KEY, email.trim().toLowerCase());
      setSuccess(`${label} activado en este dispositivo.`);
      await fetchCredentials();
    } catch {
      setError("Registro cancelado o no disponible en este dispositivo.");
    } finally {
      setAddingNew(false);
    }
  }

  async function handleDelete(credentialId: string) {
    setError(null);
    setSuccess(null);
    setDeletingId(credentialId);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

      const res = await fetch("/api/auth/webauthn/credentials", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ id: credentialId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No se pudo eliminar el dispositivo.");
        return;
      }

      if (credentials.length === 1) {
        localStorage.removeItem(BIOMETRIC_PREF_KEY);
      }
      await fetchCredentials();
    } catch {
      setError("Error al eliminar el dispositivo.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-4 sm:pb-0">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-[20px] bg-white shadow-[0_24px_60px_-20px_rgba(6,64,60,0.35)] p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">
              Seguridad
            </div>
            <h2 className="font-poppins text-[18px] font-semibold text-[#06403C] mt-0.5">
              Face ID / Biometría
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-[20px] leading-none text-black/35 hover:text-[#06403C] transition"
          >
            ✕
          </button>
        </div>

        <p className="text-[13.5px] leading-relaxed text-black/55">
          Inicia sesión con {label} en este dispositivo sin necesidad de contraseña. Puedes registrar múltiples dispositivos.
        </p>

        {error && (
          <div className="rounded-xl border border-[#D45D5D]/30 bg-[#D45D5D]/8 px-4 py-3 text-[13px] text-[#B23b3b]">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-[#7DC242]/30 bg-[#7DC242]/8 px-4 py-3 text-[13px] text-[#3a6e10]">
            {success}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-black/40 mb-1">
            Dispositivos registrados
          </div>
          {loadingList ? (
            <div className="text-[13px] text-black/40 py-2">Cargando…</div>
          ) : credentials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 px-4 py-4 text-[13.5px] text-black/40 text-center">
              Ningún dispositivo registrado aún.
            </div>
          ) : (
            credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.1] bg-[#F7F5F0] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="font-poppins text-[14px] font-medium text-[#06403C] truncate">
                    {cred.device_name || label}
                  </div>
                  <div className="text-[12px] text-black/45 mt-0.5">
                    Añadido {fmtDate(cred.created_at)}
                    {cred.last_used_at && ` · Último uso ${fmtDate(cred.last_used_at)}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cred.id)}
                  disabled={deletingId === cred.id}
                  aria-label="Eliminar dispositivo"
                  className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#D45D5D] border border-[#D45D5D]/30 hover:bg-[#D45D5D]/8 transition disabled:opacity-50"
                >
                  {deletingId === cred.id ? "…" : "Eliminar"}
                </button>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={handleAddPasskey}
          disabled={addingNew}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#06403C] px-5 py-3 font-poppins text-[14px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"
        >
          {addingNew ? "Configurando…" : `+ Registrar ${label} en este dispositivo`}
        </button>
      </div>
    </div>
  );
}
