import { NextResponse } from "next/server";
import { buildAuthenticationOptions } from "@/lib/auth/webauthn-server";
import { setChallengeCookie } from "@/lib/auth/webauthn-challenge";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  try {
    const { options, normalized } = await buildAuthenticationOptions(email);
    setChallengeCookie({
      challenge: options.challenge,
      email: normalized,
      type: "authentication",
    });
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No hay acceso biométrico";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
