"use client";

import Link from "next/link";
import { useState } from "react";

export function PaywallGate({ backHref = "/dashboard" }: { backHref?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || "No se pudo iniciar el pago.");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con Stripe.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-deep px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-mint/40 bg-cream p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green/15">
            <svg
              className="h-7 w-7 text-green"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className="mb-4 font-display text-2xl font-bold leading-snug text-teal-deep">
            Llegaste al límite de tu versión gratuita.
          </h1>

          <p className="mb-8 text-[15px] leading-relaxed text-teal">
            Para registrar tus 4 números semana a semana, ver tu historial con gráficas y usar el
            Simulador de Estrés Financiero, activa Pulso by Okomos por $499 MXN al mes.
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg px-6 py-4 font-display font-semibold text-white transition-colors duration-200 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-green/50 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "#7DC242" }}
          >
            {loading ? "Redirigiendo a Stripe…" : "Activar mi cuenta por $499 MXN/mes"}
          </button>

          <p className="mt-3 text-xs text-teal/60">
            Pago seguro con Stripe. Cancela cuando quieras desde tu tablero.
          </p>

          <Link
            href={backHref}
            className="mt-4 inline-block text-sm text-teal/70 transition-colors hover:text-teal-deep"
          >
            Volver
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-mint/70">Okomos Finanzas · Pulso by Okomos</p>
      </div>
    </main>
  );
}
