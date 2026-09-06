'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  calcularScoreSemanal,
  getWeekStartISO,
  getSemaforo,
  SEMAFORO_COLORS,
} from '@/lib/scoring'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SemaforoBadge } from '@/components/ui/SemaforoBadge'
import { PaywallGate } from '@/components/billing/PaywallGate'
import { fetchEntitlement } from '@/lib/entitlement'
import Link from 'next/link'

interface FormState {
  ventas: string
  egresos_semana: string
  saldo_bancos_efectivo: string
  cobranza_pendiente: string
}

type Step = 'form' | 'resultado'

export default function QuizPage() {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<FormState>({
    ventas: '',
    egresos_semana: '',
    saldo_bancos_efectivo: '',
    cobranza_pendiente: '',
  })
  const [result, setResult] = useState<ReturnType<typeof calcularScoreSemanal> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?next=/quiz')
        return
      }

      const entitlement = await fetchEntitlement(supabase, user)
      const { data: thisWeek } = await supabase
        .from('pulso_scores')
        .select('id')
        .eq('user_id', user.id)
        .eq('periodo_semana', getWeekStartISO())
        .maybeSingle()
      setBlocked(!entitlement.canCapture && !thisWeek)

      setChecking(false)
    }
    void checkAuth()
  }, [router])

  function handleInput(field: keyof FormState, value: string) {
    const clean = value.replace(/[^0-9.]/g, '')
    setForm((prev) => ({ ...prev, [field]: clean }))
  }

  async function handleSubmit() {
    if (blocked) return

    const ventas = parseFloat(form.ventas)
    const egresos_semana = parseFloat(form.egresos_semana)
    const saldo_bancos_efectivo = parseFloat(form.saldo_bancos_efectivo)
    const cobranza_pendiente = parseFloat(form.cobranza_pendiente)

    if ([ventas, egresos_semana, saldo_bancos_efectivo, cobranza_pendiente].some((n) => isNaN(n) || n < 0)) {
      setError('Por favor ingresa los cuatro valores antes de continuar.')
      return
    }
    if (egresos_semana <= 0) {
      setError('Los egresos de la semana son obligatorios y deben ser mayores a cero.')
      return
    }

    setLoading(true)
    setError(null)

    const inputs = { ventas, egresos_semana, saldo_bancos_efectivo, cobranza_pendiente }
    const scores = calcularScoreSemanal(inputs)

    // Se guarda por la misma API que usa la captura semanal (valida el
    // payload en el servidor y bypasea RLS con service role) — antes este
    // formulario escribía directo desde el navegador, el mismo patrón que
    // fallaba por RLS/constraints y que motivó mover ese guardado al API.
    try {
      const res = await fetch('/api/pulso/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo_semana: getWeekStartISO(),
          ventas,
          saldo_bancos_efectivo,
          egresos_semana,
          cobranza_pendiente,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error || 'No se pudo guardar tu Pulso. Intenta de nuevo.')
        setLoading(false)
        return
      }
    } catch {
      setError('No se pudo guardar tu Pulso. Revisa tu conexión e intenta de nuevo.')
      setLoading(false)
      return
    }

    setResult(scores)
    setStep('resultado')
    setLoading(false)
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-mint/40 border-t-teal animate-spin" />
          <p className="text-sm text-teal">Cargando tu Pulso...</p>
        </div>
      </main>
    )
  }

  if (blocked) {
    return <PaywallGate backHref="/dashboard" />
  }

  if (step === 'resultado' && result) {
    return <ResultadoView result={result} />
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-teal hover:text-teal-deep flex items-center gap-1 mb-4">
            ← Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep mb-2">
            Actualiza tu Pulso
          </h1>
          <p className="text-teal text-sm">
            Cuatro números de esta semana. Menos de 5 minutos.
          </p>
        </div>

        <div className="card space-y-6">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block font-display font-medium text-teal-deep mb-1">
                {field.label}
              </label>
              <p className="text-xs text-teal/60 mb-2">{field.hint}</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-teal/40 font-medium">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  value={form[field.key]}
                  onChange={(e) => handleInput(field.key, e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-mint/50 bg-cream/50
                             text-teal-deep placeholder:text-teal/25 focus:outline-none
                             focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors
                             font-mono text-lg"
                />
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              loading ||
              !form.ventas ||
              !form.egresos_semana ||
              !form.saldo_bancos_efectivo ||
              !form.cobranza_pendiente
            }
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculando...' : 'Ver mi Score'}
          </button>
        </div>

        <p className="text-center text-xs text-teal/40 mt-4">
          Tus datos se guardan solo en tu cuenta. Nadie más los ve.
        </p>
      </div>
    </main>
  )
}

function ResultadoView({
  result,
}: {
  result: ReturnType<typeof calcularScoreSemanal>
}) {
  const semaforo = getSemaforo(result.score_general)

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <p className="text-sm text-teal mb-2">Tu Score de esta semana</p>
          <ScoreRing score={result.score_general} size={160} strokeWidth={14} />
          <div className="mt-3">
            <SemaforoBadge score={result.score_general} size="lg" />
          </div>
        </div>

        <div className="card mb-4">
          <h2 className="font-display font-semibold text-teal-deep mb-4">Desglose</h2>
          <div className="space-y-4">
            {[
              { label: 'Liquidez', score: result.score_liquidez },
              { label: 'Rentabilidad', score: result.score_rentabilidad },
              { label: 'Planeación', score: result.score_planeacion },
            ].map((cat) => {
              const s = getSemaforo(cat.score)
              const color = SEMAFORO_COLORS[s]
              return (
                <div key={cat.label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-teal-deep">{cat.label}</span>
                    <span className="text-sm font-bold text-teal-deep">{cat.score}</span>
                  </div>
                  <div className="h-2 bg-mint/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${cat.score}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card text-center">
            <p className="text-2xl font-bold font-display text-teal-deep">
              {result.runway_meses.toFixed(1)}
            </p>
            <p className="text-xs text-teal mt-1">meses de cobertura</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold font-display text-teal-deep">{result.margen_real}%</p>
            <p className="text-xs text-teal mt-1">margen real</p>
          </div>
        </div>

        {result.runwayNota && (
          <p className="text-center text-xs text-teal/50 mb-4">{result.runwayNota}</p>
        )}

        {result.score_general < 70 && (
          <div className="card border-mint bg-mint/10 mb-4">
            <p className="font-display font-semibold text-teal-deep mb-1">
              Tu Score indica áreas de atención
            </p>
            <p className="text-sm text-teal mb-3">
              Un Diagnóstico Financiero puede darte claridad en 5-7 días.
            </p>
            <a
              href="https://okomosfinanzas.com"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full text-center"
            >
              Conocer el Diagnóstico →
            </a>
          </div>
        )}

        <Link href="/dashboard" className="btn-secondary w-full text-center block">
          Ver mi historial completo →
        </Link>
      </div>
    </main>
  )
}

const FIELDS: { key: keyof FormState; label: string; hint: string }[] = [
  {
    key: 'ventas',
    label: 'Ventas de la Semana',
    hint: 'Total facturado o comprometido en los últimos 7 días.',
  },
  {
    key: 'egresos_semana',
    label: 'Egresos de la Semana (Bancos + Efectivo)',
    hint: 'Nómina, renta, insumos, servicios — todo lo que salió esta semana.',
  },
  {
    key: 'saldo_bancos_efectivo',
    label: 'Efectivo Disponible (Bancos + Caja)',
    hint: 'Suma de todas tus cuentas bancarias y caja en este momento.',
  },
  {
    key: 'cobranza_pendiente',
    label: 'Cobranza Pendiente Activa',
    hint: 'Total de facturas pendientes de cobro a la fecha de hoy.',
  },
]
