import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verificar env vars ──────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("[api/pulso/save] env vars faltantes:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceKey,
      });
      return NextResponse.json(
        { error: "Configuración de servidor incompleta", code: "ENV_MISSING" },
        { status: 500 },
      );
    }

    // ── 2. Verificar sesión ────────────────────────────────────────────────
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[api/pulso/save] auth:", { userId: user?.id ?? null, authError: authError?.message ?? null });

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado", detail: authError?.message },
        { status: 401 },
      );
    }

    // ── 3. Leer payload ────────────────────────────────────────────────────
    const body = await req.json();
    const payload = {
      // Columnas legacy NOT NULL — rellenar con 0 para compatibilidad con esquema viejo
      efectivo: 0,
      gastos: 0,
      cobranza: 0,
      dias_cobertura: 0,
      ...body,
      user_id: user.id, // forzar user_id al usuario autenticado
    };

    console.log("[api/pulso/save] payload keys:", Object.keys(payload));

    // ── 4. Admin client (bypass RLS) ───────────────────────────────────────
    const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

    // ── 5. Buscar registro existente esta semana ───────────────────────────
    const { data: existing, error: selectError } = await admin
      .from("pulso_scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("periodo_semana", payload.periodo_semana)
      .maybeSingle();

    if (selectError) {
      console.error("[api/pulso/save] selectError:", selectError);
      return NextResponse.json(
        { error: selectError.message, details: selectError.details, hint: selectError.hint, code: selectError.code },
        { status: 500 },
      );
    }

    console.log("[api/pulso/save] existing:", existing?.id ?? "ninguno");

    // ── 6. INSERT o UPDATE ────────────────────────────────────────────────
    if (existing?.id) {
      const { error: updateError } = await admin
        .from("pulso_scores")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        console.error("[api/pulso/save] updateError:", updateError);
        return NextResponse.json(
          { error: updateError.message, details: updateError.details, hint: updateError.hint, code: updateError.code },
          { status: 500 },
        );
      }
    } else {
      const { error: insertError } = await admin
        .from("pulso_scores")
        .insert(payload);

      if (insertError) {
        console.error("[api/pulso/save] insertError:", insertError);
        return NextResponse.json(
          { error: insertError.message, details: insertError.details, hint: insertError.hint, code: insertError.code },
          { status: 500 },
        );
      }
    }

    console.log("[api/pulso/save] guardado OK para user:", user.id);
    return NextResponse.json({ ok: true });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/pulso/save] catch global:", message);
    return NextResponse.json({ error: message, code: "UNEXPECTED" }, { status: 500 });
  }
}
