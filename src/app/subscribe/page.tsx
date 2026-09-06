"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchEntitlement } from "@/lib/entitlement";
import { PaywallGate } from "@/components/billing/PaywallGate";

function SubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    setCancelled(searchParams.get("checkout") === "cancelled");

    async function boot() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login?next=/subscribe");
        return;
      }

      try {
        const reconcile = await fetch("/api/stripe/reconcile", { method: "POST" });
        if (reconcile.ok) {
          const body = (await reconcile.json()) as { matched?: boolean };
          if (body.matched) {
            router.replace("/dashboard?checkout=success");
            return;
          }
        }
      } catch {
        // Seguir al paywall si Stripe no responde
      }

      const entitlement = await fetchEntitlement(supabase, data.user);
      if (entitlement.canUsePremiumTools) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    }

    void boot();
  }, [router, searchParams]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <p className="text-sm text-teal">Preparando tu acceso…</p>
      </main>
    );
  }

  return (
    <div>
      {cancelled && (
        <div className="bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          Cancelaste el pago. Puedes intentarlo de nuevo cuando quieras.{" "}
          <Link href="/dashboard" className="font-semibold underline">
            Volver al tablero
          </Link>
        </div>
      )}
      <PaywallGate backHref="/" />
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-cream">
          <p className="text-sm text-teal">Cargando…</p>
        </main>
      }
    >
      <SubscribeContent />
    </Suspense>
  );
}
