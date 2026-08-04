import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-config";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Auth no configurado" }, { status: 503 });
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Tokens requeridos" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...SESSION_COOKIE_OPTIONS,
            ...(options as Parameters<typeof response.cookies.set>[2]),
          })
        );
      },
    },
  });

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  return response;
}

export async function DELETE() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ ok: true });
  }

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(url, key, {
    cookieOptions: { ...SESSION_COOKIE_OPTIONS, maxAge: 0 },
    cookies: {
      getAll() {
        return [];
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...SESSION_COOKIE_OPTIONS,
            maxAge: 0,
            ...(options as Parameters<typeof response.cookies.set>[2]),
          })
        );
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
