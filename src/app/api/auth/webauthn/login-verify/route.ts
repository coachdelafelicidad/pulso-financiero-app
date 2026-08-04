import { NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { createSessionForUser, verifyAuthentication } from "@/lib/auth/webauthn-server";
import { clearChallengeCookie, readChallengeCookie } from "@/lib/auth/webauthn-challenge";

export async function POST(request: Request) {
  const stored = readChallengeCookie();
  if (!stored || stored.type !== "authentication" || !stored.email) {
    return NextResponse.json({ error: "Desafío expirado. Intenta de nuevo." }, { status: 400 });
  }

  let body: { response?: AuthenticationResponseJSON; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body.response) {
    return NextResponse.json({ error: "Respuesta WebAuthn requerida" }, { status: 400 });
  }

  const email = (body.email || stored.email).trim().toLowerCase();
  if (email !== stored.email) {
    return NextResponse.json({ error: "Correo no coincide" }, { status: 400 });
  }

  try {
    await verifyAuthentication(email, body.response, stored.challenge);
    const session = await createSessionForUser(email);
    clearChallengeCookie();
    return NextResponse.json(session);
  } catch (err) {
    clearChallengeCookie();
    const message = err instanceof Error ? err.message : "Autenticación fallida";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
