import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  OTP_TTL_MINUTES,
  generateOtpCode,
  hashOtp,
  normalizeEmail,
} from "@/lib/password-reset-otp";
import { sendPasswordResetOtpEmail } from "@/lib/resend-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeEmail(body.email ?? "");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Recuperación de emergencia no disponible." },
        { status: 503 },
      );
    }

    const { data: userId, error: lookupError } = await admin.rpc(
      "get_auth_user_id_by_email",
      { p_email: email },
    );

    if (lookupError) {
      console.error("[request-reset-otp] lookup", lookupError);
    }

    // Respuesta genérica aunque el correo no exista (evita enumeración).
    const genericOk = {
      ok: true,
      message:
        "Si el correo está registrado, recibirás un código de 6 dígitos en unos segundos.",
    };

    if (!userId) {
      return NextResponse.json(genericOk);
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("password_reset_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", since);

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera una hora e inténtalo de nuevo." },
        { status: 429 },
      );
    }

    await admin.from("password_reset_codes").delete().eq("email", email);

    const otp = generateOtpCode();
    const codeHash = hashOtp(email, otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await admin.from("password_reset_codes").insert({
      email,
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("[request-reset-otp] insert", insertError);
      return NextResponse.json(
        { error: "No pudimos generar el código. Inténtalo de nuevo." },
        { status: 500 },
      );
    }

    const sent = await sendPasswordResetOtpEmail(email, otp);
    if (!sent) {
      return NextResponse.json(
        { error: "No pudimos enviar el correo con el código." },
        { status: 502 },
      );
    }

    return NextResponse.json(genericOk);
  } catch (error) {
    console.error("[request-reset-otp]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
