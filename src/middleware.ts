import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-config";

function applySessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, SESSION_COOKIE_OPTIONS);
  });
  return target;
}

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...SESSION_COOKIE_OPTIONS,
            ...(options as Parameters<typeof supabaseResponse.cookies.set>[2]),
          })
        );
      },
    },
  });

  await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected =
    pathname.startsWith("/quiz") || pathname.startsWith("/dashboard");

  if (isProtected && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    return applySessionCookies(redirect, supabaseResponse);
  }

  if (pathname === "/login" && user) {
    const redirect = NextResponse.redirect(new URL("/dashboard", request.url));
    return applySessionCookies(redirect, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/quiz/:path*", "/login", "/dashboard", "/dashboard/:path*"],
};
