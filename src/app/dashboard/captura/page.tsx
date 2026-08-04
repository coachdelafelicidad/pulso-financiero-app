"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  calcularScoreSemanal,
  getFactorCobranza,
  getWeekStartISO,
} from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";

type FieldKey = "saldo_bancos_efectivo" | "egresos_semana" | "cobranza_pendiente" | "ventas";

const FIELDS: {
  key: FieldKey;
  label: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    key: "ventas",
    label: "Ventas de la Semana",
    hint: "Monto total facturado o comprometido en los últimos 7 días",
    placeholder: "0",
  },
  {
    key: "egresos_semana",
    label: "Egresos de la Semana (Bancos + Efectivo)",
    hint: "Costos de nómina, luz, rentas, proveedores y operación de la semana",
    placeholder: "0",
  },
  {
    key: "saldo_bancos_efectivo",
    label: "Efectivo Disponible (Bancos + Caja)",
    hint: "El número rey. Saldo real total acumulado en tus cuentas y caja hoy",
    placeholder: "0",
  },
  {
    key: "cobranza_pendiente",
    label: "Cobranza Pendiente Activa",
    hint: "Cuentas por cobrar vigentes que te deben tus clientes actualmente",
    placeholder: "0",
  },
];

function semaforo(score: number) {
  if (score >= 70) return { color: "#7DC242", halo: "rgba(125,194,66,0.22)", label: "Salud sana" };
  if (score >= 40) return { color: "#E8A33D", halo: "rgba(232,163,61,0.22)", label: "En observación" };
  return { color: "#D45D5D", halo: "rgba(212,93,93,0.22)", label: "Necesita atención" };
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mxn(v: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? v : 0);
}

export default function CapturaPage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    ventas: "",
    egresos_semana: "",
    saldo_bancos_efectivo: "",
    cobranza_pendiente: "",
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historialEgresos, setHistorialEgresos] = useState<number[]>([]);
  const [promVentasPrev, setPromVentasPrev] = useState<number | null>(null);

  const periodoSemana = useMemo(() => getWeekStartISO(), []);

  // Auth check + fetch historial
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }

        const { data: scores } = await supabase
          .from("pulso_scores")
          .select("egresos_semana, ventas")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false })
          .limit(8);

        if (scores && scores.length > 0) {
          setHistorialEgresos(scores.map((s) => safeNum(s.egresos_semana)));
          const avgVentas =
            scores.reduce((sum, s) => sum + safeNum(s.ventas), 0) / scores.length;
          setPromVentasPrev(avgVentas);
        }
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  const handleChange = (key: FieldKey, raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "");
    setValues((prev) => ({ ...prev, [key]: cleaned }));
  };

  const parsed = useMemo(
    () => ({
      ventas: Number(values.ventas) || 0,
      egresos_semana: Number(values.egresos_semana) || 0,
      saldo_bancos_efectivo: Number(values.saldo_bancos_efectivo) || 0,
      cobranza_pendiente: Number(values.cobranza_pendiente) || 0,
    }),
    [values]
  );

  const result = useMemo(
    () => calcularScoreSemanal(parsed, historialEgresos),
    [parsed, historialEgresos]
  );

  const sc = semaforo(result.score_general);
  const hasInput =
    parsed.ventas > 0 ||
    parsed.egresos_semana > 0 ||
    parsed.saldo_bancos_efectivo > 0 ||
    parsed.cobranza_pendiente > 0;

  // Transparencia de cobranza
  const factorCobranza = getFactorCobranza(new Date());
  const cobranzaPonderada = Math.round(parsed.cobranza_pendiente * factorCobranza);
  const showCobranzaMsg = parsed.cobranza_pendiente > 0;

  // Alerta de caída de ventas >15% vs promedio previo
  const ventasAlerta =
    promVentasPrev !== null &&
    promVentasPrev > 0 &&
    parsed.ventas > 0 &&
    parsed.ventas < promVentasPrev * 0.85;

  const MAX_MONTO = 1_000_000_000_000;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (parsed.egresos_semana <= 0) {
      setError("Captura al menos los egresos de la semana para calcular tu Score.");
      return;
    }
    if (
      parsed.ventas > MAX_MONTO ||
      parsed.egresos_semana > MAX_MONTO ||
      parsed.saldo_bancos_efectivo > MAX_MONTO ||
      parsed.cobranza_pendiente > MAX_MONTO
    ) {
      setError("Alguno de los montos es demasiado alto. Verifica las cifras capturadas.");
      return;
    }

    setProcessing(true);

    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const score = calcularScoreSemanal(parsed, historialEgresos);

      const base = {
        user_id: user.id,
        ventas: parsed.ventas,
        egresos_semana: parsed.egresos_semana,
        saldo_bancos_efectivo: parsed.saldo_bancos_efectivo,
        cobranza_pendiente: parsed.cobranza_pendiente,
        periodo_semana: periodoSemana,
        runway_meses: score.runway_meses,
        caja_proyectada: score.caja_proyectada,
        score_liquidez: score.score_liquidez,
        score_rentabilidad: score.score_rentabilidad,
        score_planeacion: score.score_planeacion,
        score_general: score.score_general,
        margen_real: score.margen_real,
      };

      const { error: upsertError } = await supabase
        .from("pulso_scores")
        .upsert(base, { onConflict: "user_id,periodo_semana" });

      if (upsertError) {
        setError("No pudimos guardar tu pulso. Revisa tu conexión e inténtalo de nuevo.");
        setProcessing(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado al guardar. Inténtalo de nuevo.");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] font-sans text-[#1B2624]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-5 border-b border-black/[0.08] bg-[#F7F5F0] px-6 py-4 md:px-10">
        <Image src="/logo.png" alt="Okomos Finanzas" width={122} height={28} className="h-7 w-auto" priority />
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-[13px] font-medium text-black/60 transition hover:bg-black/[0.05] hover:text-[#06403C]"
        >
          ← Volver al Dashboard
        </Link>
      </header>

      <main className="mx-auto flex max-w-[840px] flex-col gap-9 px-6 pb-20 pt-12 md:px-10">
        <section>
          <div className="mb-2 flex items-center gap-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">
              Captura semanal
            </span>
            <span className="rounded-full bg-[#06403C]/[0.08] px-3 py-1 font-poppins text-[12px] font-semibold text-[#06403C]">
              Semana del {periodoSemana}
            </span>
          </div>
          <h1 className="mb-3 font-poppins text-[30px] font-semibold -tracking-[0.02em] text-[#06403C]">
            Registrar el Pulso de la Semana
          </h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-black/55">
            Invierte menos de 5 minutos para tomar el control absoluto de tu tesorería. Captura los 4 números clave de esta semana y tu Score de Salud se recalcula al instante.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col">
                <label
                  htmlFor={field.key}
                  className="mb-2.5 font-poppins text-[15px] font-medium text-[#06403C]"
                >
                  {field.label}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-poppins text-[16px] font-medium text-black/35">
                    $
                  </span>
                  <input
                    id={field.key}
                    name={field.key}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full rounded-2xl border border-black/[0.12] bg-white py-4 pl-9 pr-4 font-poppins text-[18px] font-semibold text-[#06403C] outline-none transition placeholder:font-normal placeholder:text-black/25 focus:border-[#7DC242] focus:ring-4 focus:ring-[#7DC242]/15"
                  />
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-black/45">
                  {field.hint}
                </p>
              </div>
            ))}
          </div>

          {/* Transparencia de cobranza */}
          {showCobranzaMsg && (
            <div className="rounded-2xl border border-[#9AD9CF]/40 bg-[#9AD9CF]/10 px-5 py-4">
              <p className="text-[13.5px] leading-relaxed text-[#06403C]">
                Tienes{" "}
                <span className="font-semibold">{mxn(parsed.cobranza_pendiente)}</span>{" "}
                en cobranza. Estimamos ingresar{" "}
                <span className="font-semibold">{mxn(cobranzaPonderada)}</span> este mes
                según la semana de cobranza ({Math.round(factorCobranza * 100)}%
                cobrabilidad estimada).
              </p>
            </div>
          )}

          {/* Alerta de caída de ventas */}
          {ventasAlerta && (
            <div className="rounded-2xl border border-[#E8A33D]/30 bg-[#E8A33D]/10 px-5 py-4">
              <p className="text-[13.5px] leading-relaxed text-[#9a6a1a]">
                <span className="font-semibold">Tendencia comercial:</span> tus ventas de esta
                semana están más de 15% por debajo de tu promedio reciente. Revisa si hay
                una causa puntual o una tendencia que atender.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-6 rounded-[20px] border border-black/[0.12] bg-white p-6">
            <div>
              <div className="mb-2 flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: sc.color, boxShadow: `0 0 0 4px ${sc.halo}` }}
                />
                <span className="text-[13px] font-medium" style={{ color: sc.color }}>
                  {hasInput ? sc.label : "Esperando tus números"}
                </span>
              </div>
              <div className="text-[13px] text-black/55">Score de Salud proyectado</div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-poppins text-[44px] font-bold leading-none -tracking-[0.02em]"
                style={{ color: hasInput ? "#06403C" : "rgba(27,38,36,0.25)" }}
              >
                {hasInput ? result.score_general : "—"}
              </span>
              <span className="font-poppins text-[18px] font-medium text-black/35">/100</span>
            </div>
          </div>

          {result.runwayNota && hasInput && (
            <p className="text-[12px] text-black/45 text-center">{result.runwayNota}</p>
          )}

          {error && (
            <div className="rounded-2xl border border-[#D45D5D]/30 bg-[#D45D5D]/10 px-5 py-4 text-[14px] font-medium text-[#B23b3b]">
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={processing}
              className="w-full max-w-[440px] rounded-2xl bg-[#7DC242] px-8 py-4 font-poppins text-[16px] font-semibold text-white shadow-[0_16px_34px_-18px_rgba(125,194,66,0.9)] transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {processing ? "Guardando tu pulso…" : "Calcular Score y Guardar Pulso Semanal"}
            </button>
            {processing && (
              <p className="text-[13px] font-medium text-black/50">
                Estamos ordenando tu tesorería…
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
