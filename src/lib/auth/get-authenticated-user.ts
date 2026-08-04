import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-config";

export async function getAuthenticatedUser(request?: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // read-only en route handlers de verificación
      },
    },
  });

  const bearer = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error && data.user) return data.user;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
