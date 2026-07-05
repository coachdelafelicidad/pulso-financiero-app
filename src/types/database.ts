export interface Profile {
  id: string
  business_name: string | null
  created_at: string
}

export interface PulsoScore {
  id: string
  user_id: string
  ventas: number
  gastos: number
  efectivo: number
  cobranza: number
  score_liquidez: number
  score_rentabilidad: number
  score_planeacion: number
  score_general: number
  dias_cobertura: number
  margen_real: number
  created_at: string
}

export interface RegistroPulso {
  id: string
  nombre: string
  correo: string
  negocio: string | null
  respuestas: Record<string, number>
  score_liquidez: number
  score_rentabilidad: number
  score_planeacion: number
  score_general: number
  created_at: string
}
