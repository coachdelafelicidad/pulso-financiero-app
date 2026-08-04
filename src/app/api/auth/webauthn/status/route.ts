import { NextResponse } from "next/server";
import { emailHasWebAuthn } from "@/lib/auth/webauthn-server";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ hasPasskey: false });
  }

  const hasPasskey = await emailHasWebAuthn(email);
  return NextResponse.json({ hasPasskey });
}
