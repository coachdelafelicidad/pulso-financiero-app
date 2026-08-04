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

/** Semana del mes (1-4) basada en el día del mes. */
export function getSemanaMes(date: Date): 1 | 2 | 3 | 4 {
  const day = date.getDate()
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

/**
 * Factor de cobrabilidad estimada según la semana del mes.
 * Semana 1 → 100%, 2 → 75%, 3 → 50%, 4 → 25%.
 */
export function getFactorCobranza(date: Date): number {
  const semana = getSemanaMes(date)
  const factores: Record<1 | 2 | 3 | 4, number> = { 1: 1.0, 2: 0.75, 3: 0.50, 4: 0.25 }
  return factores[semana]
}

/** Semanas que faltan para terminar el mes en curso. */
export function getSemanasRestantesMes(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return (daysInMonth - date.getDate()) / 7
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

  let nota: string | undefined
  let muestra = [...semanas].slice(0, 8)

  if (muestra.length < 8) {
    nota = 'Tu promedio de cobertura se estabilizará tras 8 semanas de registro'
  }

  // Media truncada: elimina max y min si hay al menos 3 datos
  if (muestra.length >= 3) {
    const sorted = [...muestra].sort((a, b) => a - b)
    muestra = sorted.slice(1, sorted.length - 1)
  }

  const gastoSemanalBase = muestra.reduce((s, v) => s + v, 0) / muestra.length
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
  date: Date = new Date(),
): WeeklyScoreResult {
  const { saldo_bancos_efectivo, egresos_semana, cobranza_pendiente, ventas } = inputs

  // Proyección de caja — ventas excluidas del disponible
  const factorCobranza = getFactorCobranza(date)
  const semanasRestantes = getSemanasRestantesMes(date)
  const caja_proyectada =
    saldo_bancos_efectivo +
    cobranza_pendiente * factorCobranza -
    egresos_semana * semanasRestantes

  // Runway con historial (incluye la semana actual como primera entrada)
  const egresosConActual = [egresos_semana, ...historialEgresos]
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

  // Score Planeación: cobranza pendiente como ratio de ventas (penalización)
  // 0% cobranza pendiente = 100, 50%+ = 0
  const cobRatio = ventas > 0 ? cobranza_pendiente / ventas : 0
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
