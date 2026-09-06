"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  calcularEgresoPromedio,
  calcularScoreSemanal,
  getFactorCobranza,
  getSemanasRestantesMes,
} from "@/lib/scoring";
import { createClient, clearSessionCookies } from "@/lib/supabase/client";
import { BiometricPrompt } from "@/components/auth/BiometricPrompt";
import { PasskeyManager } from "@/components/auth/PasskeyManager";
import { InstallAppModal } from "@/components/dashboard/InstallAppModal";
import { BIOMETRIC_PREF_KEY } from "@/lib/auth/session-config";
import { isPlatformAuthenticatorAvailable } from "@/lib/auth/webauthn-client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { fetchEntitlement } from "@/lib/entitlement";
import type { PulsoScore } from "@/types/database";

const TEAL = "#06403C";
const MINT = "#9AD9CF";
const LIME = "#7DC242";
const CREAM = "#F7F5F0";
const INK = "#1B2624";
const AMBER = "#E8A33D";
const RED = "#D45D5D";

const mxn = (v: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(v) ? v : 0);

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeData(raw: Partial<PulsoData> | PulsoData): PulsoData {
  return {
    ventas: safeNumber(raw.ventas),
    egresos_semana: safeNumber(raw.egresos_semana),
    saldo_bancos_efectivo: safeNumber(raw.saldo_bancos_efectivo),
    cobranza_pendiente: safeNumber(raw.cobranza_pendiente),
  };
}

const STORAGE_KEY = "pulso_captura";

function clearLocalCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("pulso_premium");
  } catch {
    // Ignoramos errores de almacenamiento local.
  }
}

type PulsoData = {
  ventas: number;
  egresos_semana: number;
  saldo_bancos_efectivo: number;
  cobranza_pendiente: number;
};

const EMPTY_DATA: PulsoData = {
  ventas: 0,
  egresos_semana: 0,
  saldo_bancos_efectivo: 0,
  cobranza_pendiente: 0,
};

type Identity = { name: string; company: string };

function trendWeekLabel(periodoSemana: string): string {
  const d = new Date(periodoSemana + "T12:00:00");
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function semaforoScore(score: number) {
  if (score >= 70) return { color: LIME, halo: "rgba(125,194,66,0.22)", labelKey: "score.healthy" };
  if (score >= 40) return { color: AMBER, halo: "rgba(232,163,61,0.22)", labelKey: "score.warning" };
  return { color: RED, halo: "rgba(212,93,93,0.22)", labelKey: "score.danger" };
}

const STATUS_DOT: Record<string, string> = { good: LIME, warn: AMBER, bad: RED };

type KpiKey = "ventas" | "egresos_semana" | "saldo_bancos_efectivo" | "cobranza_pendiente";

type KpiDelta = {
  label: string;
  value: number;
  delta: string;
  deltaColor: string;
  deltaYoY: string | null;
  deltaYoYColor: string;
  status: "good" | "warn";
  hint: string;
};

function monthKey(date: string | Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  return monthKey(d);
}

function sameMonthPrevYearKey(from: Date = new Date()): string {
  const d = new Date(from.getFullYear() - 1, from.getMonth(), 1);
  return monthKey(d);
}

function latestSnapshotPerMonth(scores: PulsoScore[]): Map<string, PulsoScore> {
  const sorted = [...scores].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const map = new Map<string, PulsoScore>();
  for (const s of sorted) {
    const key = monthKey(s.created_at);
    if (!map.has(key)) map.set(key, s);
  }
  return map;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatDelta(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(0)}%`;
}

function deltaColor(key: KpiKey, pct: number | null): string {
  if (pct === null || pct === 0) return "rgba(27,38,36,0.4)";
  const up = pct > 0;
  if (key === "ventas" || key === "saldo_bancos_efectivo") return up ? LIME : RED;
  return up ? RED : LIME;
}

function deltaPrefix(pct: number | null): string {
  if (pct === null || pct === 0) return "";
  return pct > 0 ? "↑ " : "↓ ";
}

function buildKpis(
  current: PulsoData,
  previousMonth: PulsoData | null,
  previousYear: PulsoData | null,
  t: (k: string) => string
): KpiDelta[] {
  const defs: { key: KpiKey; labelKey: string; hintKey: string; status: "good" | "warn" }[] = [
    { key: "ventas",                labelKey: "kpi.sales",       hintKey: "kpi.hint_sales",       status: "good" },
    { key: "egresos_semana",        labelKey: "kpi.expenses",    hintKey: "kpi.hint_expenses",    status: "warn" },
    { key: "saldo_bancos_efectivo", labelKey: "kpi.cash",        hintKey: "kpi.hint_cash",        status: "good" },
    { key: "cobranza_pendiente",    labelKey: "kpi.receivables", hintKey: "kpi.hint_receivables", status: "warn" },
  ];

  return defs.map(({ key, labelKey, hintKey, status }) => {
    const pct = previousMonth ? pctChange(safeNumber(current[key]), safeNumber(previousMonth[key])) : null;
    const pctYoY = previousYear ? pctChange(safeNumber(current[key]), safeNumber(previousYear[key])) : null;
    return {
      label: t(labelKey),
      value: safeNumber(current[key]),
      delta: `${deltaPrefix(pct)}${formatDelta(pct)}`.trim() || "—",
      deltaColor: deltaColor(key, pct),
      deltaYoY: pctYoY !== null ? `${deltaPrefix(pctYoY)}${formatDelta(pctYoY)}`.trim() : null,
      deltaYoYColor: deltaColor(key, pctYoY),
      status,
      hint: t(hintKey),
    };
  });
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [ventasDrop, setVentasDrop] = useState(0);
  const [cobranzaDelay, setCobranzaDelay] = useState(0);
  const [data, setData] = useState<PulsoData>(EMPTY_DATA);
  const [hasData, setHasData] = useState(false);
  const [dbScore, setDbScore] = useState<number | null>(null);
  const [scoreHistory, setScoreHistory] = useState<PulsoScore[]>([]);
  const [identity, setIdentity] = useState<Identity>({ name: "", company: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInstallApp, setShowInstallApp] = useState(false);
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [canCapture, setCanCapture] = useState(true);
  const [canUsePremiumTools, setCanUsePremiumTools] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showPasskeyManager, setShowPasskeyManager] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [latestPeriodo, setLatestPeriodo] = useState<Date>(new Date());

  useEffect(() => {
    let active = true;

    async function handleCheckoutSuccess(sessionId: string) {
      setIsRefreshing(true);
      clearLocalCache();

      try {
        const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          setShowPremiumWelcome(true);
          setCanCapture(true);
          setCanUsePremiumTools(true);
        }
      } catch {
        // Si falla la verificación, igual forzamos recarga de datos reales.
      } finally {
        if (active) {
          setDataRefreshKey((k) => k + 1);
          router.replace("/dashboard", { scroll: false });
          router.refresh();
          setIsRefreshing(false);
        }
      }
    }

    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkout === "success" && sessionId) {
      void handleCheckoutSuccess(sessionId);
    }

    if (searchParams.get("setup_biometric") === "1") {
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    let active = true;

    (async () => {
      const supabase = createClient();

      try {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          try {
            const res = await fetch("/api/auth/session", { credentials: "same-origin" });
            if (res.ok) {
              const payload = (await res.json()) as {
                access_token?: string;
                refresh_token?: string;
              };
              if (payload.access_token && payload.refresh_token) {
                await supabase.auth.setSession({
                  access_token: payload.access_token,
                  refresh_token: payload.refresh_token,
                });
              }
            }
          } catch {
            // Sin hidratación desde servidor
          }

          ({
            data: { session },
          } = await supabase.auth.getSession());
        }

        let user = session?.user ?? null;

        if (!user) {
          const { data: userData } = await supabase.auth.getUser();
          user = userData.user ?? null;
        }

        if (!user) {
          try {
            const res = await fetch("/api/auth/session", { credentials: "same-origin" });
            if (res.ok) {
              const payload = (await res.json()) as {
                user?: { id: string; email?: string; user_metadata?: Record<string, unknown> };
                access_token?: string;
                refresh_token?: string;
              };
              if (payload.access_token && payload.refresh_token) {
                await supabase.auth.setSession({
                  access_token: payload.access_token,
                  refresh_token: payload.refresh_token,
                });
                const { data: hydrated } = await supabase.auth.getUser();
                user = hydrated.user ?? null;
              }
            }
          } catch {
            // Sin hidratación desde servidor
          }
        }

        if (!user) {
          if (active) router.replace("/login");
          return;
        }

        if (!active) return;

        setIsAuthenticated(true);
        setUserEmail(user.email ?? "");

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const fallbackName =
          (typeof metadata.full_name === "string" ? metadata.full_name.trim() : "") ||
          user.email?.split("@")[0]?.trim() ||
          "Usuario";
        const fallbackCompany =
          (typeof metadata.business_name === "string" ? metadata.business_name.trim() : "") ||
          "Mi Empresa";

        setIdentity({ name: fallbackName, company: fallbackCompany });
      } catch {
        if (active) router.replace("/login");
        return;
      }

      if (!active) return;

      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user || !active) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("business_name, subscription_status, subscribed_at")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        let entitlement = await fetchEntitlement(supabase, user);
        if (!entitlement.canUsePremiumTools) {
          try {
            const reconcile = await fetch("/api/stripe/reconcile", { method: "POST" });
            if (reconcile.ok) {
              const body = (await reconcile.json()) as { matched?: boolean };
              if (body.matched) {
                entitlement = await fetchEntitlement(supabase, user);
                setShowPremiumWelcome(true);
              }
            }
          } catch {
            // El tablero sigue siendo usable en modo free
          }
        }

        setCanCapture(entitlement.canCapture);
        setCanUsePremiumTools(entitlement.canUsePremiumTools);
        setHasStripeCustomer(Boolean(entitlement.stripeCustomerId));

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const company =
          profile?.business_name?.trim() ||
          (typeof metadata.business_name === "string" ? metadata.business_name.trim() : "") ||
          "Mi Empresa";
        const name =
          (typeof metadata.full_name === "string" ? metadata.full_name.trim() : "") ||
          user.email?.split("@")[0]?.trim() ||
          "Usuario";

        // 520 semanas ≈ 10 años de registro semanal — suficiente para no
        // truncar el histórico de negocios de varios años (antes 100
        // cortaba silenciosamente a los ~23 meses de uso).
        const { data: scores } = await supabase
          .from("pulso_scores")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(520);

        if (!active) return;

        const history = (scores ?? []) as PulsoScore[];
        const last = history[0];

        setIdentity({ name, company });
        setScoreHistory(history);

        if (last) {
          setData(normalizeData(last));
          setDbScore(safeNumber(last.score_general));
          setHasData(true);
          // Fecha del registro para calcular factorCobranza con el período correcto
          setLatestPeriodo(new Date(last.periodo_semana + "T12:00:00"));
        } else {
          setData(EMPTY_DATA);
          setDbScore(null);
          setHasData(false);
        }
      } catch {
        // La sesión es válida: mostramos tablero vacío sin expulsar al usuario.
        if (active) {
          setData(EMPTY_DATA);
          setDbScore(null);
          setHasData(false);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [dataRefreshKey, router]);

  useEffect(() => {
    let active = true;

    async function maybeShowBiometricPrompt() {
      if (!userEmail) return;

      const pref = localStorage.getItem(BIOMETRIC_PREF_KEY);
      if (pref === "enabled" || pref === "dismissed") return;

      const platformOk = await isPlatformAuthenticatorAvailable();
      if (!platformOk || !active) return;

      try {
        const res = await fetch(
          `/api/auth/webauthn/status?email=${encodeURIComponent(userEmail)}`
        );
        const data = await res.json();
        if (active && !data.hasPasskey) {
          setShowBiometricPrompt(true);
        }
      } catch {
        // sin prompt si falla la verificación
      }
    }

    void maybeShowBiometricPrompt();
    return () => {
      active = false;
    };
  }, [userEmail]);

  const displayIdentity = useMemo(
    () => ({
      name: identity?.name?.trim() || "Usuario",
      company: identity?.company?.trim() || "Mi Empresa",
    }),
    [identity]
  );

  const safeData = useMemo(() => normalizeData(data), [data]);

  const score = useMemo(() => {
    if (dbScore !== null) return safeNumber(dbScore);
    if (hasData) return safeNumber(calcularScoreSemanal(safeData).score_general);
    return 0;
  }, [dbScore, hasData, safeData]);
  const sc = semaforoScore(score);
  const showBanner = hasData && score < 70;

  async function handleManageBilling() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || t("dash.portal_error"));
      }
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : t("dash.portal_error"));
      setPortalLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await createClient().auth.signOut();
      await clearSessionCookies();
    } catch {
      // Ignoramos errores de cierre de sesión y redirigimos de todos modos.
    }
    router.push("/login");
    router.refresh();
  }

  const kpis = useMemo(() => {
    if (!hasData || scoreHistory.length === 0) {
      return buildKpis(safeData, null, null, t);
    }

    // Ancla las comparaciones a la fecha del último registro, no a la
    // fecha del sistema — igual que el simulador (ver latestPeriodo).
    const byMonth = latestSnapshotPerMonth(scoreHistory);
    const previousMonth = byMonth.get(previousMonthKey(latestPeriodo));
    const previousYear = byMonth.get(sameMonthPrevYearKey(latestPeriodo));

    return buildKpis(
      safeData,
      previousMonth ? normalizeData(previousMonth) : null,
      previousYear ? normalizeData(previousYear) : null,
      t
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeData, hasData, scoreHistory, t, latestPeriodo]);

  // Tendencia real de las últimas 8 semanas registradas (no datos ficticios).
  const chartData = useMemo(() => {
    return [...scoreHistory]
      .sort((a, b) => new Date(a.periodo_semana).getTime() - new Date(b.periodo_semana).getTime())
      .slice(-8)
      .map((s) => ({
        semana: trendWeekLabel(s.periodo_semana),
        saldo_bancos_efectivo: safeNumber(s.saldo_bancos_efectivo),
        egresos_semana: safeNumber(s.egresos_semana),
      }));
  }, [scoreHistory]);

  // Últimas semanas de egresos (excluye el registro actual) para el promedio
  // truncado — misma fuente que calcularScoreSemanal usa en captura.
  const historialEgresos = useMemo(
    () => scoreHistory.slice(1, 9).map((s) => safeNumber(s.egresos_semana)),
    [scoreHistory]
  );

  const sim = useMemo(() => {
    // Usa la fecha del registro, no la fecha actual del sistema
    const now = hasData ? latestPeriodo : new Date();
    const factorBase = getFactorCobranza(now);
    const semanasRestantes = getSemanasRestantesMes(now);

    // Cobranza estresada: delay adicional reduce el factor de recuperación
    const stressFactor = Math.max(0, 1 - cobranzaDelay / 60);
    const effectiveFactor = factorBase * stressFactor;

    // Gasto promedio truncado (mismo cálculo que el score oficial), no solo
    // el de la semana actual — evita que una semana atípica distorsione
    // la proyección de las semanas restantes del mes.
    const egresoPromedio = calcularEgresoPromedio([
      safeData.egresos_semana,
      ...historialEgresos,
    ]);

    // Escenario base (sin estrés): caja = saldo + cobranza×factor − egresos
    // Ventas NO entran — son devengado, no cobrado
    const baseProjected =
      safeData.saldo_bancos_efectivo +
      safeData.cobranza_pendiente * factorBase -
      safeData.egresos_semana -
      (semanasRestantes > 0 ? egresoPromedio * semanasRestantes : 0);

    // Escenario estresado: cobranza degradada por retraso
    const projected =
      safeData.saldo_bancos_efectivo +
      safeData.cobranza_pendiente * effectiveFactor -
      safeData.egresos_semana -
      (semanasRestantes > 0 ? egresoPromedio * semanasRestantes : 0);

    const delta = projected - baseProjected;
    const gastoMensual = egresoPromedio * 4.33;
    const coverage = gastoMensual > 0 ? projected / gastoMensual : 0;

    let color = LIME, halo = "rgba(125,194,66,0.22)", labelKey = "sim.healthy";
    if (projected < gastoMensual) { color = RED; halo = "rgba(212,93,93,0.22)"; labelKey = "sim.risk"; }
    else if (projected < gastoMensual * 2) { color = AMBER; halo = "rgba(232,163,61,0.22)"; labelKey = "sim.tight"; }

    // Impacto de la caída de ventas en rentabilidad (el slider no toca la
    // caja disponible — las ventas son devengado, no cobrado — pero sí
    // afecta cuánto margen deja el negocio esa semana).
    const ventasStress = safeData.ventas * (1 - ventasDrop / 100);
    const margenEstresado =
      ventasStress > 0
        ? Math.round(((ventasStress - safeData.egresos_semana) / ventasStress) * 1000) / 10
        : safeData.egresos_semana > 0
          ? -100
          : 0;

    return { projected, delta, coverage, egresoPromedio, color, halo, labelKey, margenEstresado };
  }, [cobranzaDelay, ventasDrop, safeData, hasData, latestPeriodo, historialEgresos]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] font-poppins text-[#06403C]">
        {t('dash.loading')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] font-poppins text-[#06403C]">
        {t('dash.redirecting')}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] font-sans text-[#1B2624]">
      <header className="no-print sticky top-0 z-10 flex items-center justify-between gap-5 border-b border-black/[0.08] bg-[#F7F5F0] px-6 py-4 md:px-10">
        <Image src="/logo.png" alt="Okomos Finanzas" width={140} height={32} className="h-8 w-auto" priority />
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-2 rounded-full border border-black/[0.12] px-3.5 py-2 text-[13px] font-medium text-black/60 transition hover:border-[#06403C]/40 hover:text-[#06403C]"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold">?</span>
            <span className="hidden sm:inline">{t('dash.how_to')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowInstallApp(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[#06403C] px-3.5 py-2 font-poppins text-[13px] font-medium text-[#06403C] transition hover:border-[#9AD9CF] hover:bg-[#06403C]/[0.05]"
          >
            <span className="hidden sm:inline">{t('dash.install')}</span>
            <span className="sm:hidden">{t('dash.install_short')}</span>
            <span aria-hidden="true">📱</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPasskeyManager(true)}
            title={t('dash.face_id')}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.12] px-3.5 py-2 text-[13px] font-medium text-black/60 transition hover:border-[#06403C]/40 hover:text-[#06403C]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M12 11c1.66 0 3-1.34 3-3S13.66 5 12 5 9 6.34 9 8s1.34 3 3 3z"/>
              <path d="M4 12c1.2-3.2 4.2-5 8-5s6.8 1.8 8 5"/>
            </svg>
            <span className="hidden sm:inline">{t('dash.face_id')}</span>
          </button>
          {hasStripeCustomer && (
            <button
              type="button"
              onClick={() => void handleManageBilling()}
              disabled={portalLoading}
              className="hidden items-center rounded-full border border-black/[0.12] px-3.5 py-2 text-[13px] font-medium text-black/60 transition hover:border-[#06403C]/40 hover:text-[#06403C] md:inline-flex"
            >
              {portalLoading ? t("dash.portal_loading") : t("dash.manage_billing")}
            </button>
          )}
          <span className="h-7 w-px bg-black/10" />
          <div className="text-right leading-tight">
            <div className="text-[13.5px] text-black/55">{displayIdentity.company}</div>
            <div className="font-poppins text-[15px] font-semibold text-[#06403C]">{displayIdentity.name}</div>
          </div>
          <span className="h-7 w-px bg-black/10" />
          <button
            onClick={handleLogout}
            className="rounded-full px-4 py-2 text-[13px] font-medium text-black/60 transition hover:bg-black/[0.05] hover:text-[#06403C]"
          >
            {t('dash.logout')}
          </button>
        </div>
      </header>

      <main id="dashboard-report" className="executive-report mx-auto flex max-w-[1120px] flex-col gap-8 px-6 pb-16 pt-9 md:px-10">
        <div className="print-only executive-report-letterhead mb-2 border-b border-[#06403C]/20 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-poppins text-[22px] font-semibold tracking-tight text-[#06403C]">
                Okomos Finanzas
              </div>
              <div className="mt-1 text-[14px] text-black/55">Reporte Ejecutivo — Tu Pulso por Okomos</div>
            </div>
            <div className="text-right text-[13px] leading-relaxed text-black/55">
              <div className="font-poppins font-medium text-[#06403C]">{displayIdentity.company}</div>
              <div>{displayIdentity.name}</div>
              <div className="mt-1">
                {new Date().toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {portalError && (
          <div className="no-print rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] text-red-700">
            {portalError}
          </div>
        )}

        {isRefreshing && (
          <div className="no-print rounded-[16px] border border-[#06403C]/15 bg-white px-5 py-4 text-[14px] text-[#06403C]">
            {t('dash.syncing')}
          </div>
        )}

        {showPremiumWelcome && (
          <div className="no-print flex items-start justify-between gap-4 rounded-[16px] border border-[#7DC242]/30 bg-[#7DC242]/10 px-5 py-4">
            <div>
              <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5a9a2f]">
                {t('dash.premium_badge')}
              </div>
              <p className="font-poppins text-[15px] font-medium text-[#06403C]">
                {t('dash.premium_body')}
              </p>
            </div>
            <button
              onClick={() => setShowPremiumWelcome(false)}
              aria-label={t('common.close')}
              className="shrink-0 text-[18px] leading-none text-black/40 transition hover:text-[#06403C]"
            >
              ✕
            </button>
          </div>
        )}

        {showBiometricPrompt && userEmail && (
          <div className="no-print">
            <BiometricPrompt
              email={userEmail}
              onDismiss={() => setShowBiometricPrompt(false)}
              onEnabled={() => setShowBiometricPrompt(false)}
            />
          </div>
        )}

        {showPasskeyManager && userEmail && (
          <PasskeyManager
            email={userEmail}
            onClose={() => setShowPasskeyManager(false)}
          />
        )}

        {!canUsePremiumTools && (
          <div className="no-print flex flex-col gap-3 rounded-[16px] border border-[#E8A33D]/40 bg-[#E8A33D]/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] text-[#06403C]">{t("dash.free_banner")}</p>
            <Link
              href="/subscribe"
              className="inline-flex w-fit items-center justify-center rounded-full bg-[#7DC242] px-4 py-2 font-poppins text-[13px] font-medium text-white"
            >
              {t("dash.free_cta")}
            </Link>
          </div>
        )}

        {!hasData && (
          <div className="no-print rounded-[16px] border border-[#06403C]/15 bg-white px-5 py-4 text-[14px] text-[#06403C]">
            {t('dash.no_data')} <strong>{t('dash.no_data_cta')}</strong> {t('dash.no_data_suffix')}
          </div>
        )}

        <section className="report-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">
              {t('dash.pulse_badge')}
            </div>
            <h1 className="font-poppins text-[26px] font-semibold -tracking-[0.02em] text-[#06403C]">
              {t('dash.pulse_title')}
            </h1>
          </div>
          <Link
            href={canCapture ? "/dashboard/captura" : "/subscribe"}
            className="no-print mb-4 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-[#7DC242] px-5 py-3 font-poppins text-[14px] font-medium text-white shadow-[0_14px_30px_-16px_rgba(125,194,66,0.9)] transition hover:brightness-95 active:scale-[0.98] sm:mb-0"
          >
            {canCapture ? t("dash.register_cta") : t("dash.free_cta")}
          </Link>
        </section>

        <section className="report-section grid grid-cols-1 gap-5 md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col justify-between rounded-[20px] border border-black/[0.12] bg-[#F7F5F0] p-8">
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: sc.color, boxShadow: `0 0 0 4px ${sc.halo}` }} />
              <span className="text-[13.5px] font-medium" style={{ color: sc.color }}>{t(sc.labelKey)}</span>
            </div>
            <div>
              <div className="mb-1 text-[13px] text-black/55">{t('dash.score_label')}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-poppins text-[72px] font-bold leading-[0.9] -tracking-[0.03em] text-[#06403C]">{score}</span>
                <span className="font-poppins text-[22px] font-medium text-black/35">/100</span>
              </div>
            </div>
          </div>

          {showBanner && (
            <div className="relative flex flex-col justify-center gap-4 overflow-hidden rounded-[20px] bg-[#06403C] p-8">
              <div className="absolute -right-10 -top-10 h-[150px] w-[150px] rounded-full bg-[#9AD9CF]/[0.14]" />
              <div className="relative">
                <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9AD9CF]">{t('alert.badge')}</div>
                <p className="mb-1 max-w-[340px] font-poppins text-[19px] font-medium leading-snug -tracking-[0.01em] text-[#F7F5F0]">
                  {t('alert.title')}
                </p>
                <p className="max-w-[340px] text-[14px] leading-relaxed text-[#F7F5F0]/70">
                  {t('alert.body')}
                </p>
              </div>
              <Link
                href="https://okomosfinanzas.com/diagnostico.html"
                className="no-print relative mt-1 inline-flex w-fit items-center justify-center rounded-full bg-[#7DC242] px-6 py-3 font-poppins text-[15px] font-medium text-white transition hover:brightness-95 active:scale-[0.98]"
              >
                {t('alert.cta')}
              </Link>
            </div>
          )}
        </section>

        <section className="report-section grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-black/[0.08] bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[13.5px] leading-snug text-black/70">{k.label}</span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                  style={{ background: `${STATUS_DOT[k.status]}22`, color: k.status === "good" ? "#5a9a2f" : AMBER }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[k.status] }} />
                  {k.status === "good" ? t('kpi.good') : t('kpi.attention')}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-poppins text-[26px] font-semibold -tracking-[0.02em] text-[#06403C]">{mxn(k.value)}</span>
                <span className="text-[12px] font-medium" style={{ color: k.deltaColor }}>{k.delta}</span>
              </div>
              {k.deltaYoY && (
                <div className="mt-0.5 text-[11px] font-medium" style={{ color: k.deltaYoYColor }}>
                  {k.deltaYoY} {t('kpi.vs_last_year')}
                </div>
              )}
              <div className="mt-1 text-[12.5px] text-black/45">{k.hint}</div>
            </div>
          ))}
        </section>

        <section className="report-section print-chart rounded-[20px] border border-black/[0.08] bg-white p-7 shadow-[0_18px_40px_-28px_rgba(6,64,60,0.4)]">
          <div className="mb-3.5">
            <h2 className="mb-1 font-poppins text-[18px] font-semibold -tracking-[0.01em] text-[#06403C]">
              {t('chart.title')}
            </h2>
            <p className="text-[13.5px] text-black/55">{t('chart.subtitle')}</p>
          </div>
          <div className="print-chart-container min-h-[300px]">
            {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="rgba(27,38,36,0.06)" />
              <XAxis dataKey="semana" tickLine={false} axisLine={false} dy={8}
                tick={{ fill: "rgba(27,38,36,0.45)", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={48}
                domain={[0, "auto"]}
                tickFormatter={(v) => `$${Math.round(safeNumber(v) / 1000)}k`}
                tick={{ fill: "rgba(27,38,36,0.45)", fontSize: 12 }} />
              <Tooltip
                formatter={(v: number, n) => [mxn(safeNumber(v)), n ?? ""]}
                contentStyle={{ borderRadius: 12, border: "1px solid rgba(27,38,36,0.12)", boxShadow: "0 12px 30px -14px rgba(6,64,60,0.45)" }}
                labelStyle={{ color: INK, fontWeight: 600, marginBottom: 4 }}
                cursor={{ stroke: "rgba(27,38,36,0.15)", strokeWidth: 1 }}
              />
              <Legend iconType="plainline" align="right" verticalAlign="top" height={34}
                wrapperStyle={{ fontSize: 12.5, color: "rgba(27,38,36,0.6)" }} />
              <Line type="monotone" dataKey="saldo_bancos_efectivo" name={t('chart.cash_line')} stroke={MINT} strokeWidth={2.75} dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="egresos_semana" name={t('chart.expense_line')} stroke={TEAL} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-black/[0.1] bg-[#F7F5F0]/60 text-[14px] text-black/50">
                {t('chart.empty')}
              </div>
            )}
          </div>
        </section>

        <section id="simulador-estres" className="report-section stress-report relative rounded-[20px] border border-black/[0.12] bg-[#F7F5F0] p-8">
          {!canUsePremiumTools && (
            <div className="no-print absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[20px] bg-[#F7F5F0]/92 px-6 text-center">
              <p className="max-w-sm font-poppins text-[16px] font-semibold text-[#06403C]">
                {t("dash.sim_locked")}
              </p>
              <Link
                href="/subscribe"
                className="mt-4 inline-flex rounded-full bg-[#7DC242] px-5 py-2.5 font-poppins text-[13px] font-medium text-white"
              >
                {t("dash.free_cta")}
              </Link>
            </div>
          )}
          <div className="no-print mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">{t('sim.badge')}</div>
          <h2 className="mb-1 font-poppins text-[20px] font-semibold -tracking-[0.01em] text-[#06403C]">
            {t('sim.title')}
          </h2>
          <p className="no-print mb-6 max-w-[520px] text-[14px] leading-relaxed text-black/55">
            {t('sim.subtitle')}
          </p>

          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-7">
              <SimSlider
                label={t('sim.slider_sales')}
                value={ventasDrop === 0 ? t('sim.no_change') : `−${ventasDrop}%`}
                min={0} max={50} step={5} current={ventasDrop} onChange={setVentasDrop}
              />
              <SimSlider
                label={t('sim.slider_collection')}
                value={`${cobranzaDelay} ${t('sim.days')}`}
                min={0} max={60} step={5} current={cobranzaDelay} onChange={setCobranzaDelay}
              />
              <div className="no-print flex flex-wrap items-center gap-3">
                <button
                  onClick={() => { setVentasDrop(0); setCobranzaDelay(0); }}
                  className="w-fit rounded-full border border-black/[0.18] px-[18px] py-2 text-[13px] font-medium text-black/60 transition hover:border-[#06403C]/40 hover:text-[#06403C]"
                >
                  {t('sim.reset')}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[#06403C] px-[18px] py-2 font-poppins text-[13px] font-medium text-[#06403C] transition hover:border-[#9AD9CF] hover:bg-[#06403C]/[0.05]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 17H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 17v4h10v-4"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('sim.export')}
                </button>
              </div>
            </div>

            <div className="stress-report-results rounded-2xl border border-black/[0.08] bg-white p-7 shadow-[0_14px_34px_-24px_rgba(6,64,60,0.5)]">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: sim.color, boxShadow: `0 0 0 4px ${sim.halo}` }} />
                <span className="text-[13px] font-medium" style={{ color: sim.color }}>{t(sim.labelKey)}</span>
              </div>
              <div className="mb-1 text-[13px] text-black/55">{t('sim.cash_label')}</div>
              <div className="font-poppins text-[44px] font-bold leading-none -tracking-[0.02em] text-[#06403C]">
                {mxn(sim.projected)}
              </div>
              <div className="mt-2 text-[13.5px] font-medium" style={{ color: sim.delta < 0 ? RED : "rgba(27,38,36,0.5)" }}>
                {sim.delta >= 0 ? "+" : "−"}{mxn(Math.abs(sim.delta))} {t('sim.vs_base')}
              </div>
              <div className="my-5 h-px bg-black/[0.08]" />
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] text-black/55">{t("sim.avg_weekly_spend")}</span>
                <span className="font-poppins text-[18px] font-semibold text-[#06403C]">
                  {mxn(sim.egresoPromedio)}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-[13.5px] text-black/55">{t('sim.coverage')}</span>
                <span className="font-poppins text-[18px] font-semibold" style={{ color: sim.color }}>
                  {sim.coverage.toFixed(1)} {t('sim.months')}
                </span>
              </div>
              {ventasDrop > 0 && (
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-[13.5px] text-black/55">{t('sim.margin_label')}</span>
                  <span
                    className="font-poppins text-[18px] font-semibold"
                    style={{ color: sim.margenEstresado < 0 ? RED : "#06403C" }}
                  >
                    {sim.margenEstresado}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {showHelp && <HelpModal score={score} onClose={() => setShowHelp(false)} />}
      {showInstallApp && <InstallAppModal onClose={() => setShowInstallApp(false)} />}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] font-poppins text-[#06403C]">
          Cargando…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function HelpModal({ score, onClose }: { score: number; onClose: () => void }) {
  const { t } = useLanguage();
  const steps = [
    { title: t('help.step1_title'), body: t('help.step1_body', { score }) },
    { title: t('help.step2_title'), body: t('help.step2_body') },
    { title: t('help.step3_title'), body: t('help.step3_body') },
    { title: t('help.step4_title'), body: t('help.step4_body') },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      onClick={onClose}
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#06403C]/35 px-5 py-8 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-black/[0.08] bg-[#F7F5F0] shadow-[0_40px_80px_-32px_rgba(6,64,60,0.55)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] px-8 pb-5 pt-7">
          <div>
            <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7DC242]">
              {t('help.badge')}
            </div>
            <h2 id="help-title" className="font-poppins text-[22px] font-semibold -tracking-[0.02em] text-[#06403C]">
              {t('help.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.12] text-[16px] leading-none text-black/50 transition hover:border-[#06403C]/40 hover:text-[#06403C]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-8 py-7">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06403C] font-poppins text-[14px] font-semibold text-[#F7F5F0]">
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 font-poppins text-[15.5px] font-semibold -tracking-[0.01em] text-[#06403C]">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-black/60">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-black/[0.08] px-8 py-5">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-[#7DC242] px-6 py-3 font-poppins text-[15px] font-medium text-white transition hover:brightness-95 active:scale-[0.99]"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SimSlider({
  label, value, min, max, step, current, onChange,
}: {
  label: string; value: string; min: number; max: number; step: number;
  current: number; onChange: (n: number) => void;
}) {
  const pct = max > min ? ((current - min) / (max - min)) * 100 : 0;

  return (
    <div>
      <div className="mb-3.5 flex items-baseline justify-between">
        <span className="text-[14.5px]">{label}</span>
        <span className="font-poppins text-[17px] font-semibold text-[#06403C]">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="okm-range no-print w-full"
        style={{
          background: `linear-gradient(to right, #06403C ${pct}%, rgba(27, 38, 36, 0.12) ${pct}%)`,
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-label={label}
      />
    </div>
  );
}
