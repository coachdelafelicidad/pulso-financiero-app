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

export interface MonthlyInputs {
  ventas: number
  gastos: number
  efectivo: number
  cobranza: number
}

export interface MonthlyScoreResult extends ScoreResult {
  dias_cobertura: number
  margen_real: number
}

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

/**
 * Score basado en los 4 números del plan mensual.
 * Convierte inputs cuantitativos a la misma escala 0-100.
 */
export function calcularScoreMensual(inputs: MonthlyInputs): MonthlyScoreResult {
  const { ventas, gastos, efectivo, cobranza } = inputs

  // Días de cobertura: efectivo / (gastos / 30)
  const gastosDiarios = gastos / 30
  const dias_cobertura = gastosDiarios > 0 ? efectivo / gastosDiarios : 0

  // Margen real: (ventas - gastos) / ventas × 100
  const margen_real = ventas > 0 ? ((ventas - gastos) / ventas) * 100 : 0

  // Score Liquidez: días de cobertura → 0-100
  // 0 días = 0, 60+ días = 100
  const score_liquidez = Math.min(100, Math.round((dias_cobertura / 60) * 100))

  // Score Rentabilidad: margen real → 0-100
  // ≤0% = 0, ≥30% = 100
  const score_rentabilidad = Math.min(100, Math.max(0, Math.round((margen_real / 30) * 100)))

  // Score Planeación: cobranza como % de ventas → penalización
  // 0% cobranza pendiente = 100, 50%+ = 0
  const cobRatio = ventas > 0 ? cobranza / ventas : 0
  const score_planeacion = Math.min(100, Math.max(0, Math.round((1 - cobRatio / 0.5) * 100)))

  const score_general = Math.round((score_liquidez + score_rentabilidad + score_planeacion) / 3)

  return {
    score_liquidez,
    score_rentabilidad,
    score_planeacion,
    score_general,
    dias_cobertura: Math.round(dias_cobertura),
    margen_real: Math.round(margen_real * 10) / 10,
  }
}

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
