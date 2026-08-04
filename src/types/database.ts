export interface Profile {
  id: string
  business_name: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscribed_at: string | null
  created_at: string
}

export interface PulsoScore {
  id: string
  user_id: string
  saldo_bancos_efectivo: number
  egresos_semana: number
  cobranza_pendiente: number
  ventas: number
  periodo_semana: string       // ISO date YYYY-MM-DD (lunes de la semana)
  runway_meses: number
  caja_proyectada: number
  score_liquidez: number
  score_rentabilidad: number
  score_planeacion: number
  score_general: number
  margen_real: number
  created_at: string
}

export interface VipEmail {
  email: string
  nota: string | null
  created_at: string
}

export interface WebAuthnCredential {
  id: string
  user_id: string
  email: string
  credential_id: string
  public_key: string
  counter: number
  device_name: string | null
  transports: string[] | null
  created_at: string
  last_used_at: string | null
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
