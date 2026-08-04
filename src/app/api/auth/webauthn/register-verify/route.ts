import { NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { verifyRegistration } from "@/lib/auth/webauthn-server";
import { clearChallengeCookie, readChallengeCookie } from "@/lib/auth/webauthn-challenge";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  const stored = readChallengeCookie();
  if (!stored || stored.type !== "registration") {
    return NextResponse.json({ error: "Desafío expirado. Intenta de nuevo." }, { status: 400 });
  }

  let body: { response?: RegistrationResponseJSON; deviceName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body.response) {
    return NextResponse.json({ error: "Respuesta WebAuthn requerida" }, { status: 400 });
  }

  try {
    await verifyRegistration(
      user.id,
      user.email,
      body.response,
      stored.challenge,
      body.deviceName
    );
    clearChallengeCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    clearChallengeCookie();
    const message = err instanceof Error ? err.message : "Registro fallido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
