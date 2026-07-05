'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularScoreMensual, getSemaforo, SEMAFORO_COLORS, SEMAFORO_LABELS } from '@/lib/scoring'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SemaforoBadge } from '@/components/ui/SemaforoBadge'
import Link from 'next/link'

interface FormState {
  ventas: string
  gastos: string
  efectivo: string
  cobranza: string
}

type Step = 'form' | 'resultado'

export default function QuizPage() {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState<FormState>({ ventas: '', gastos: '', efectivo: '', cobranza: '' })
  const [result, setResult] = useState<ReturnType<typeof calcularScoreMensual> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previousCount, setPreviousCount] = useState(0)
  const [showUpgrade, setShowUpgrade] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      // Contar registros anteriores para trigger de upgrade
      const { count } = await supabase
        .from('pulso_scores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setPreviousCount(count ?? 0)
    }
    checkAuth()
  }, [])

  function handleInput(field: keyof FormState, value: string) {
    // Solo números positivos
    const clean = value.replace(/[^0-9.]/g, '')
    setForm((prev) => ({ ...prev, [field]: clean }))
  }

  async function handleSubmit() {
    const ventas = parseFloat(form.ventas)
    const gastos = parseFloat(form.gastos)
    const efectivo = parseFloat(form.efectivo)
    const cobranza = parseFloat(form.cobranza)

    if ([ventas, gastos, efectivo, cobranza].some((n) => isNaN(n) || n < 0)) {
      setError('Por favor ingresa los cuatro valores antes de continuar.')
      return
    }

    setLoading(true)
    setError(null)

    const scores = calcularScoreMensual({ ventas, gastos, efectivo, cobranza })
    setResult(scores)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('pulso_scores').insert({
        user_id: user.id,
        ventas,
        gastos,
        efectivo,
        cobranza,
        ...scores,
      })
    }

    // Segunda vez o más → mostrar upgrade CTA
    if (previousCount >= 1) setShowUpgrade(true)

    setStep('resultado')
    setLoading(false)
  }

  if (step === 'resultado' && result) {
    return <ResultadoView result={result} showUpgrade={showUpgrade} />
  }

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-teal hover:text-teal-deep flex items-center gap-1 mb-4">
            ← Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep mb-2">
            Actualiza tu Pulso
          </h1>
          <p className="text-teal text-sm">
            Cuatro números de este mes. Menos de 5 minutos.
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
            disabled={loading || !form.ventas || !form.gastos || !form.efectivo || !form.cobranza}
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
  showUpgrade,
}: {
  result: ReturnType<typeof calcularScoreMensual>
  showUpgrade: boolean
}) {
  const semaforo = getSemaforo(result.score_general)

  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <p className="text-sm text-teal mb-2">Tu Score de este mes</p>
          <ScoreRing score={result.score_general} size={160} strokeWidth={14} />
          <div className="mt-3">
            <SemaforoBadge score={result.score_general} size="lg" />
          </div>
        </div>

        {/* Desglose por categoría */}
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

        {/* Métricas clave */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card text-center">
            <p className="text-2xl font-bold font-display text-teal-deep">{result.dias_cobertura}</p>
            <p className="text-xs text-teal mt-1">días de cobertura</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold font-display text-teal-deep">{result.margen_real}%</p>
            <p className="text-xs text-teal mt-1">margen real</p>
          </div>
        </div>

        {/* CTA upgrade (segunda vez en adelante) */}
        {showUpgrade && (
          <div className="card border-teal bg-teal-deep/5 mb-4">
            <p className="font-display font-semibold text-teal-deep mb-1">
              ¿Tu Score mejoró o empeoró desde la última vez?
            </p>
            <p className="text-sm text-teal mb-3">
              Con el Plan Mensual lo ves en una gráfica automáticamente, con
              alertas si algo entra en zona roja. Sin recordar volver.
            </p>
            <button className="btn-primary w-full">
              Ver Plan Mensual — $499 MXN/mes
            </button>
            {/* Stripe/MercadoPago hook — activar en fase 2 */}
          </div>
        )}

        {/* CTA Okomos si score < 70 */}
        {result.score_general < 70 && (
          <div className="card border-mint bg-mint/10 mb-4">
            <p className="font-display font-semibold text-teal-deep mb-1">
              Tu Score indica áreas de atención
            </p>
            <p className="text-sm text-teal mb-3">
              Un Diagnóstico Financiero con Mario puede darte claridad en 5-7 días.
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
    label: 'Ventas del mes',
    hint: 'Total facturado este mes, antes de cualquier gasto.',
  },
  {
    key: 'gastos',
    label: 'Gastos operativos',
    hint: 'Nómina, renta, insumos, servicios — todo lo que gastaste para operar.',
  },
  {
    key: 'efectivo',
    label: 'Efectivo disponible hoy',
    hint: 'Suma de todas tus cuentas bancarias en este momento.',
  },
  {
    key: 'cobranza',
    label: 'Lo que te deben clientes',
    hint: 'Total de facturas pendientes de cobro a la fecha de hoy.',
  },
]
