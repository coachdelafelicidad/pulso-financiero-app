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

    // Se busca el código activo del correo SIN filtrar por hash todavía,
    // para poder contar intentos fallidos contra ese código puntual y
    // bloquearlo tras varios fallos — en vez de permitir probar las
    // 1,000,000 de combinaciones posibles dentro de la ventana de 15 min.
    const { data: rows, error: fetchError } = await admin
      .from("password_reset_codes")
      .select("id, code_hash, verify_attempts")
      .eq("email", email)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[emergency-reset] fetch", fetchError);
      return NextResponse.json({ error: "Error al validar el código." }, { status: 500 });
    }

    const row = rows?.[0] as { id: string; code_hash: string; verify_attempts?: number } | undefined;
    const genericInvalid = () =>
      NextResponse.json(
        { error: "Código incorrecto o expirado. Solicita uno nuevo." },
        { status: 400 },
      );

    if (!row) {
      return genericInvalid();
    }

    const attempts = row.verify_attempts ?? 0;
    if (attempts >= 5) {
      await admin.from("password_reset_codes").delete().eq("id", row.id);
      return genericInvalid();
    }

    if (row.code_hash !== codeHash) {
      const { error: attemptError } = await admin
        .from("password_reset_codes")
        .update({ verify_attempts: attempts + 1 })
        .eq("id", row.id);
      // Si la columna aún no existe (migración 09 no aplicada), se ignora
      // el error y el reseteo legítimo con el código correcto sigue
      // funcionando — solo se pierde el límite de intentos hasta migrar.
      if (attemptError) console.error("[emergency-reset] attempt-count", attemptError);
      return genericInvalid();
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
