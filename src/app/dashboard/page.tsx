import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SemaforoBadge } from '@/components/ui/SemaforoBadge'
import { EvolutionChart } from '@/components/dashboard/EvolutionChart'
import { Simulador } from '@/components/dashboard/Simulador'
import { getSemaforo, SEMAFORO_COLORS, SEMAFORO_LABELS } from '@/lib/scoring'
import type { PulsoScore } from '@/types/database'
import Link from 'next/link'
import { LogoutButton } from '@/components/layout/LogoutButton'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single()

  const { data: scores } = await supabase
    .from('pulso_scores')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const typedScores = (scores ?? []) as PulsoScore[]
  const lastScore = typedScores[typedScores.length - 1] ?? null

  return (
    <main className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="bg-white border-b border-mint/20 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-deep flex items-center justify-center">
              <span className="text-mint font-display font-bold text-sm">P</span>
            </div>
            <div>
              <p className="font-display font-semibold text-teal-deep text-sm leading-tight">
                Pulso Financiero
              </p>
              {profile?.business_name && (
                <p className="text-xs text-teal/60 leading-tight">{profile.business_name}</p>
              )}
            </div>
          </div>
          <LogoutButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Estado vacío */}
        {typedScores.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="font-display text-2xl font-bold text-teal-deep mb-2">
              Tu Pulso está listo para empezar
            </h2>
            <p className="text-teal mb-8 max-w-sm mx-auto">
              Captura los números de este mes y en menos de 5 minutos
              conocerás la salud financiera real de tu empresa.
            </p>
            <Link href="/quiz" className="btn-primary">
              Capturar mis números →
            </Link>
          </div>
        )}

        {/* Dashboard con datos */}
        {lastScore && (
          <>
            {/* Score principal */}
            <div className="card mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="font-display text-lg font-bold text-teal-deep">
                    Tu Score de {new Date(lastScore.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                  </h1>
                  <SemaforoBadge score={lastScore.score_general} />
                </div>
                <ScoreRing score={lastScore.score_general} size={100} strokeWidth={10} />
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-cream rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold font-display text-teal-deep">
                    {lastScore.dias_cobertura}
                  </p>
                  <p className="text-xs text-teal mt-1">días de cobertura</p>
                </div>
                <div className="bg-cream rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold font-display text-teal-deep">
                    {lastScore.margen_real}%
                  </p>
                  <p className="text-xs text-teal mt-1">margen real</p>
                </div>
              </div>

              {/* Desglose por categoría */}
              <div className="space-y-3">
                {[
                  { label: 'Liquidez', score: lastScore.score_liquidez },
                  { label: 'Rentabilidad', score: lastScore.score_rentabilidad },
                  { label: 'Planeación', score: lastScore.score_planeacion },
                ].map((cat) => {
                  const s = getSemaforo(cat.score)
                  const color = SEMAFORO_COLORS[s]
                  return (
                    <div key={cat.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-teal">{cat.label}</span>
                        <span className="text-sm font-bold text-teal-deep">{cat.score}</span>
                      </div>
                      <div className="h-1.5 bg-mint/20 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${cat.score}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link href="/quiz" className="btn-primary w-full text-center block mt-4">
                Actualizar mi Score →
              </Link>
            </div>

            {/* CTA a Okomos si score < 70 */}
            {lastScore.score_general < 70 && (
              <div className="card border-mint bg-teal-deep/5 mb-4">
                <p className="font-display font-semibold text-teal-deep mb-1">
                  Tu Score indica áreas de atención
                </p>
                <p className="text-sm text-teal mb-3">
                  Un Diagnóstico Financiero con Mario puede darte un plan claro en 5-7 días.
                </p>
                <a
                  href="https://okomosfinanzas.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-teal-deep underline underline-offset-2"
                >
                  Conocer el Diagnóstico de Okomos Finanzas →
                </a>
              </div>
            )}

            {/* Gráfica de evolución */}
            {typedScores.length > 1 && (
              <div className="card mb-4">
                <h2 className="font-display font-semibold text-teal-deep mb-4">
                  Evolución de tu Pulso
                </h2>
                <EvolutionChart scores={typedScores} />
                <div className="flex gap-4 mt-3 justify-center text-xs text-teal/60 flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-teal-deep inline-block" /> Score general
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-mint inline-block" /> Liquidez
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-green inline-block" /> Rentabilidad
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-yellow-400 inline-block" /> Planeación
                  </span>
                </div>
              </div>
            )}

            {/* Simulador */}
            <Simulador lastScore={lastScore} />
          </>
        )}
      </div>
    </main>
  )
}
