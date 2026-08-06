import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verificar sesión del usuario
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Leer payload
  const body = await req.json();

  // Forzar user_id al usuario autenticado (seguridad)
  const payload = { ...body, user_id: user.id };

  // 3. Admin client con service role — sin restricciones de RLS
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 4. ¿Existe ya un registro para esta semana?
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("pulso_scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("periodo_semana", payload.periodo_semana)
    .maybeSingle();

  if (selectError) {
    console.error("[api/pulso/save] selectError:", selectError);
    return NextResponse.json(
      { error: selectError.message, details: selectError.details },
      { status: 500 },
    );
  }

  let saveError;
  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("pulso_scores")
      .update(payload)
      .eq("id", existing.id);
    saveError = error;
  } else {
    const { error } = await supabaseAdmin
      .from("pulso_scores")
      .insert(payload);
    saveError = error;
  }

  if (saveError) {
    console.error("[api/pulso/save] saveError:", saveError);
    return NextResponse.json(
      {
        error: saveError.message,
        details: saveError.details,
        hint: saveError.hint,
        code: saveError.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
