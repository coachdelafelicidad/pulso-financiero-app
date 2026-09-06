export interface QuizAnswers {
  q1: number // 1-4
  q2: number
  q3: number
  q4: number
  q5: number
  q6: number
}

export interface ScoreResult {
  score_liquidez: number
  score_rentabilidad: number
  score_planeacion: number
  score_general: number
}

export interface WeeklyInputs {
  saldo_bancos_efectivo: number
  egresos_semana: number
  cobranza_pendiente: number
  ventas: number
}

export interface WeeklyScoreResult extends ScoreResult {
  runway_meses: number
  caja_proyectada: number
  margen_real: number
  runwayNota?: string
}

// ── Helpers de calendario ──────────────────────────────────────────────────

export type SemanaMes = 1 | 2 | 3 | 4 | 5

function daysInMonthOf(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/** 4 semanas si el mes tiene 28 días; 5 si tiene 29–31. */
export function getSemanasDelMes(date: Date): 4 | 5 {
  return Math.ceil(daysInMonthOf(date) / 7) as 4 | 5
}

/**
 * Semana del mes (1–5) según el día calendario.
 * 1–7 → 1, 8–14 → 2, 15–21 → 3, 22–28 → 4, 29–31 → 5.
 */
export function getSemanaMes(date: Date): SemanaMes {
  const week = Math.min(5, Math.max(1, Math.ceil(date.getDate() / 7))) as SemanaMes
  return Math.min(week, getSemanasDelMes(date)) as SemanaMes
}

/**
 * Factor de cobrabilidad estimada según la semana del mes.
 * Semana 1 → 100%, 2 → 75%, 3 → 50%, 4 → 25%, 5 → 0%.
 */
export function getFactorCobranza(date: Date): number {
  const factores: Record<SemanaMes, number> = {
    1: 1.0,
    2: 0.75,
    3: 0.5,
    4: 0.25,
    5: 0,
  }
  return factores[getSemanaMes(date)]
}

/** Semanas de gasto que faltan después de la semana actual. */
export function getSemanasRestantesMes(date: Date): number {
  return Math.max(0, getSemanasDelMes(date) - getSemanaMes(date))
}

/**
 * Día de operación en México. La caja a fin de mes se proyecta con
 * el calendario de hoy, no con el lunes ISO de la semana: si hoy es
 * 6 sep y el periodo es 31 ago, sigue siendo semana 1 (factor 100%).
 */
export function hoyOperacion(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return new Date(`${y}-${m}-${d}T12:00:00`)
}

export function getCalendarioProyeccion(date: Date = hoyOperacion()) {
  return {
    semana: getSemanaMes(date),
    semanasDelMes: getSemanasDelMes(date),
    factor: getFactorCobranza(date),
    restantes: getSemanasRestantesMes(date),
  }
}

/**
 * Caja a fin de mes:
 * efectivo + cobranza×factor(semana actual) − egreso de esta semana
 * − gasto semanal promedio × semanas que faltan.
 */
export function calcularCajaFinDeMes(input: {
  saldo_bancos_efectivo: number
  cobranza_pendiente: number
  egresos_semana: number
  egresoPromedio: number
  date?: Date
}): number {
  const date = input.date ?? hoyOperacion()
  const factor = getFactorCobranza(date)
  const restantes = getSemanasRestantesMes(date)
  return (
    input.saldo_bancos_efectivo +
    input.cobranza_pendiente * factor -
    input.egresos_semana -
    (restantes > 0 ? input.egresoPromedio * restantes : 0)
  )
}

/** ISO date YYYY-MM-DD del lunes de la semana actual. */
export function getWeekStartISO(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

// ── Runway (meses de operación a 8 semanas) ────────────────────────────────

/**
 * Media truncada de hasta 8 semanas de egresos.
 * Elimina el máximo y el mínimo cuando hay al menos 3 datos.
 */
export function calcularEgresoPromedio(historial: number[]): number {
  const validos = historial.filter((v) => Number.isFinite(v) && v >= 0)
  if (validos.length === 0) return 0
  let muestra = [...validos].slice(0, 8)
  if (muestra.length >= 3) {
    const sorted = [...muestra].sort((a, b) => a - b)
    muestra = sorted.slice(1, sorted.length - 1)
  }
  return muestra.reduce((s, v) => s + v, 0) / muestra.length
}

/**
 * Calcula runway con media truncada sobre las últimas 8 semanas de egresos.
 * Elimina la semana más alta y la más baja antes de promediar.
 * Si hay menos de 8 registros usa los disponibles y adjunta una nota.
 */
export function calcularRunway(
  historialEgresos: number[],
  saldoBancosEfectivo: number,
): { runway_meses: number; nota?: string } {
  const semanas = historialEgresos.filter((v) => Number.isFinite(v) && v >= 0)

  if (semanas.length === 0) {
    return { runway_meses: 0 }
  }

  const nota: string | undefined =
    semanas.slice(0, 8).length < 8
      ? 'Tu promedio de cobertura se estabilizará tras 8 semanas de registro'
      : undefined

  const gastoSemanalBase = calcularEgresoPromedio(semanas)
  const gastoMensualEstabilizado = gastoSemanalBase * 4.33

  const runway_meses =
    gastoMensualEstabilizado > 0
      ? Math.round((saldoBancosEfectivo / gastoMensualEstabilizado) * 10) / 10
      : 0

  return { runway_meses, nota }
}

// ── Score semanal principal ────────────────────────────────────────────────

/**
 * Calcula el score de salud financiera a partir de los 4 inputs semanales.
 * La cobranza se degrada automáticamente según la semana del mes.
 * El runway usa la media truncada del historial de egresos.
 */
export function calcularScoreSemanal(
  inputs: WeeklyInputs,
  historialEgresos: number[] = [],
  _date: Date = new Date(),
): WeeklyScoreResult {
  const { saldo_bancos_efectivo, egresos_semana, cobranza_pendiente, ventas } = inputs

  // Runway con historial (incluye la semana actual como primera entrada)
  const egresosConActual = [egresos_semana, ...historialEgresos]

  // Proyección de caja a fin de mes con el calendario de operación
  // (hoy en México), no el lunes ISO — evita el 31 ago = “mes cerrado”.
  const egresoPromedio = calcularEgresoPromedio(egresosConActual)
  const caja_proyectada = calcularCajaFinDeMes({
    saldo_bancos_efectivo,
    cobranza_pendiente,
    egresos_semana,
    egresoPromedio,
    date: hoyOperacion(),
  })
  const { runway_meses, nota: runwayNota } = calcularRunway(egresosConActual, saldo_bancos_efectivo)

  // Margen real de la semana
  const margen_real =
    ventas > 0 ? Math.round(((ventas - egresos_semana) / ventas) * 1000) / 10 : 0

  // Score Liquidez: runway → 0-100 (0 meses = 0, 6+ meses = 100)
  const score_liquidez = Math.min(100, Math.round((runway_meses / 6) * 100))

  // Score Rentabilidad: margen → 0-100 (≤0% = 0, ≥30% = 100)
  const score_rentabilidad = Math.min(
    100,
    Math.max(0, Math.round((margen_real / 30) * 100)),
  )

  // Score Planeación: cobranza pendiente (saldo acumulado) como ratio de
  // ventas MENSUALIZADAS (semana × 4.33) — no de una sola semana.
  // La cobranza pendiente es un saldo (stock); comparada contra el flujo de
  // una sola semana, cualquier negocio con clientes de crédito normal
  // (p. ej. cartera equivalente a 2-3 semanas de venta) marcaría 0 siempre.
  // 0% de ventas mensuales pendientes = 100, 50%+ = 0.
  // Sin ventas esta semana pero con cobranza pendiente = riesgo máximo,
  // no riesgo cero (no hay ingreso nuevo que respalde lo pendiente).
  const ventasMensualizadas = ventas * 4.33
  const cobRatio =
    ventasMensualizadas > 0 ? cobranza_pendiente / ventasMensualizadas : (cobranza_pendiente > 0 ? 1 : 0)
  const score_planeacion = Math.min(
    100,
    Math.max(0, Math.round((1 - cobRatio / 0.5) * 100)),
  )

  const score_general = Math.round(
    (score_liquidez + score_rentabilidad + score_planeacion) / 3,
  )

  return {
    score_liquidez,
    score_rentabilidad,
    score_planeacion,
    score_general,
    runway_meses,
    caja_proyectada: Math.round(caja_proyectada),
    margen_real,
    runwayNota,
  }
}

// ── Quiz (sin cambios) ─────────────────────────────────────────────────────

/**
 * Fórmula oficial del quiz de 6 preguntas.
 * promedio(Q1,Q2) × 25 → 0-100, etc.
 */
export function calcularScoreQuiz(answers: QuizAnswers): ScoreResult {
  const liquidez = Math.round(((answers.q1 + answers.q2) / 2) * 25)
  const rentabilidad = Math.round(((answers.q3 + answers.q4) / 2) * 25)
  const planeacion = Math.round(((answers.q5 + answers.q6) / 2) * 25)
  const general = Math.round((liquidez + rentabilidad + planeacion) / 3)

  return {
    score_liquidez: liquidez,
    score_rentabilidad: rentabilidad,
    score_planeacion: planeacion,
    score_general: general,
  }
}

// ── Semáforo ───────────────────────────────────────────────────────────────

export type Semaforo = 'verde' | 'amarillo' | 'rojo'

export function getSemaforo(score: number): Semaforo {
  if (score >= 70) return 'verde'
  if (score >= 40) return 'amarillo'
  return 'rojo'
}

export const SEMAFORO_COLORS: Record<Semaforo, string> = {
  verde: '#7DC242',
  amarillo: '#F5A623',
  rojo: '#E53E3E',
}

export const SEMAFORO_BG: Record<Semaforo, string> = {
  verde: 'bg-green/10 border-green text-green',
  amarillo: 'bg-yellow-50 border-yellow-400 text-yellow-700',
  rojo: 'bg-red-50 border-red-400 text-red-700',
}

export const SEMAFORO_LABELS: Record<Semaforo, string> = {
  verde: 'Saludable',
  amarillo: 'En observación',
  rojo: 'Requiere atención',
}
