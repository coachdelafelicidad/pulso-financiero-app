import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-config";

let browserClient: SupabaseClient | undefined;

/**
 * Cliente de navegador alineado con @supabase/ssr — misma sesión en cookies
 * que lee el Middleware y las Server Routes de Next.js.
 */
export function createClient() {
  if (typeof window === "undefined") {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: SESSION_COOKIE_OPTIONS }
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: SESSION_COOKIE_OPTIONS }
    );
  }

  return browserClient;
}

/** Refuerza la sesión en cookies del servidor (SSR/middleware). */
export async function syncSessionToCookies(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token || !session.refresh_token) return false;

  const res = await fetch("/api/auth/sync-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }),
  });

  return res.ok;
}

/** Limpia cookies de sesión SSR al cerrar sesión. */
export async function clearSessionCookies(): Promise<void> {
  await fetch("/api/auth/sync-session", {
    method: "DELETE",
    credentials: "same-origin",
  });
}
