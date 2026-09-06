import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { calcularScoreSemanal } from "@/lib/scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MONTO = 1_000_000_000_000;
const PERIODO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidMonto(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= MAX_MONTO;
}

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
        { error: "No se pudo guardar tu registro. Intenta de nuevo en unos minutos.", code: "ENV_MISSING" },
        { status: 500 },
      );
    }

    // ── 2. Verificar sesión ────────────────────────────────────────────────
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ── 3. Leer y VALIDAR el payload — nunca reenviar el body tal cual a un
    // insert con service_role (bypasea RLS): solo se aceptan estos campos,
    // con tipo y rango verificados, y el score se recalcula en el servidor
    // en vez de confiar en el que mandó el cliente. ───────────────────────
    const body = await req.json();

    if (!PERIODO_RE.test(body.periodo_semana)) {
      return NextResponse.json({ error: "Periodo inválido." }, { status: 400 });
    }

    const inputs = {
      ventas: body.ventas,
      egresos_semana: body.egresos_semana,
      saldo_bancos_efectivo: body.saldo_bancos_efectivo,
      cobranza_pendiente: body.cobranza_pendiente,
    };

    if (!Object.values(inputs).every(isValidMonto)) {
      return NextResponse.json({ error: "Alguno de los montos no es válido." }, { status: 400 });
    }

    if (inputs.egresos_semana <= 0) {
      return NextResponse.json({ error: "Los egresos de la semana son obligatorios." }, { status: 400 });
    }

    // ── 4. Admin client (bypass RLS) ───────────────────────────────────────
    const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    const email = user.email?.trim() ?? "";
    const { data: vip } = email
      ? await admin.from("vip_emails").select("email").ilike("email", email).maybeSingle()
      : { data: null };

    const unlocked = profile?.subscription_status === "active" || Boolean(vip?.email);

    const { count: scoreCount } = await admin
      .from("pulso_scores")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { data: sameWeek } = await admin
      .from("pulso_scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("periodo_semana", body.periodo_semana)
      .maybeSingle();

    if (!unlocked && !sameWeek && (scoreCount ?? 0) >= 1) {
      return NextResponse.json(
        { error: "Activa tu suscripción para registrar más semanas.", code: "PAYWALL" },
        { status: 402 },
      );
    }

    // Historial de egresos (hasta 8 semanas previas) para recalcular el
    // score con el mismo promedio truncado que usa el resto de la app.
    const { data: historial } = await admin
      .from("pulso_scores")
      .select("egresos_semana")
      .eq("user_id", user.id)
      .neq("periodo_semana", body.periodo_semana)
      .order("created_at", { ascending: false })
      .limit(8);

    const historialEgresos = (historial ?? []).map((h) => Number(h.egresos_semana) || 0);
    const score = calcularScoreSemanal(
      inputs,
      historialEgresos,
      new Date(body.periodo_semana + "T12:00:00"),
    );

    const payload = {
      user_id: user.id,
      periodo_semana: body.periodo_semana,
      ventas: inputs.ventas,
      egresos_semana: inputs.egresos_semana,
      saldo_bancos_efectivo: inputs.saldo_bancos_efectivo,
      cobranza_pendiente: inputs.cobranza_pendiente,
      runway_meses: score.runway_meses,
      caja_proyectada: score.caja_proyectada,
      score_liquidez: score.score_liquidez,
      score_rentabilidad: score.score_rentabilidad,
      score_planeacion: score.score_planeacion,
      score_general: score.score_general,
      margen_real: score.margen_real,
    };

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
        { error: "No se pudo guardar tu registro. Intenta de nuevo en unos minutos.", code: selectError.code },
        { status: 500 },
      );
    }

    // ── 6. INSERT o UPDATE ────────────────────────────────────────────────
    if (existing?.id) {
      const { error: updateError } = await admin
        .from("pulso_scores")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) {
        console.error("[api/pulso/save] updateError:", updateError);
        return NextResponse.json(
          { error: "No se pudo guardar tu registro. Intenta de nuevo en unos minutos.", code: updateError.code },
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
          { error: "No se pudo guardar tu registro. Intenta de nuevo en unos minutos.", code: insertError.code },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/pulso/save] catch global:", message);
    return NextResponse.json(
      { error: "No se pudo guardar tu registro. Intenta de nuevo en unos minutos.", code: "UNEXPECTED" },
      { status: 500 },
    );
  }
}
