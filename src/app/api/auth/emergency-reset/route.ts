import { NextResponse } from "next/server";
import { hashOtp, normalizeEmail } from "@/lib/password-reset-otp";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      otp?: string;
      password?: string;
    };

    const email = normalizeEmail(body.email ?? "");
    const otp = (body.otp ?? "").trim();
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "El código debe tener 6 dígitos." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Recuperación de emergencia no disponible." },
        { status: 503 },
      );
    }

    const codeHash = hashOtp(email, otp);
    const now = new Date().toISOString();

    const { data: rows, error: fetchError } = await admin
      .from("password_reset_codes")
      .select("id")
      .eq("email", email)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[emergency-reset] fetch", fetchError);
      return NextResponse.json({ error: "Error al validar el código." }, { status: 500 });
    }

    const row = rows?.[0];
    if (!row) {
      return NextResponse.json(
        { error: "Código incorrecto o expirado. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    const { data: userId, error: lookupError } = await admin.rpc(
      "get_auth_user_id_by_email",
      { p_email: email },
    );

    if (lookupError || !userId) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      console.error("[emergency-reset] updateUser", updateError);
      return NextResponse.json(
        { error: updateError.message || "No pudimos actualizar la contraseña." },
        { status: 500 },
      );
    }

    await admin
      .from("password_reset_codes")
      .update({ used_at: now })
      .eq("id", row.id);

    await admin.from("password_reset_codes").delete().eq("email", email);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[emergency-reset]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
