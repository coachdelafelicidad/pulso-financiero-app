"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Ruta legacy sin autenticación — redirige al flujo real protegido. */
export default function CaptureLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      router.replace(data.user ? "/dashboard/captura" : "/login");
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] font-poppins text-[#06403C]">
      Redirigiendo…
    </div>
  );
}
