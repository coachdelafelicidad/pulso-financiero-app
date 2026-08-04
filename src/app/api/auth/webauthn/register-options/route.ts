import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { buildRegistrationOptions } from "@/lib/auth/webauthn-server";
import { setChallengeCookie } from "@/lib/auth/webauthn-challenge";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }

  let deviceName: string | undefined;
  try {
    const body = await request.json();
    deviceName = typeof body?.deviceName === "string" ? body.deviceName : undefined;
  } catch {
    // cuerpo opcional
  }

  try {
    const { options, normalized } = await buildRegistrationOptions(user.id, user.email, deviceName);
    setChallengeCookie({
      challenge: options.challenge,
      email: normalized,
      type: "registration",
    });
    return NextResponse.json({ options });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al preparar registro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
