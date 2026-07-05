'use client'

import { useState } from 'react'
import type { PulsoScore } from '@/types/database'
import { calcularScoreMensual, getSemaforo, SEMAFORO_COLORS } from '@/lib/scoring'

interface SimuladorProps {
  lastScore: PulsoScore
}

export function Simulador({ lastScore }: SimuladorProps) {
  const [variacion, setVariacion] = useState(0) // -50 a +50 %

  const ventasSimuladas = lastScore.ventas * (1 + variacion / 100)
  const sim = calcularScoreMensual({
    ventas: ventasSimuladas,
    gastos: lastScore.gastos,
    efectivo: lastScore.efectivo,
    cobranza: lastScore.cobranza,
  })

  const color = SEMAFORO_COLORS[getSemaforo(sim.score_general)]

  return (
    <div className="card">
      <h3 className="font-display font-semibold text-teal-deep mb-1">
        Simulador de escenarios
      </h3>
      <p className="text-xs text-teal mb-4">
        ¿Qué pasa si tus ventas cambian? Mueve el control para explorarlo.
      </p>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-teal mb-2">
          <span>−50%</span>
          <span className={`font-bold text-sm ${variacion > 0 ? 'text-green' : variacion < 0 ? 'text-red-500' : 'text-teal-deep'}`}>
            {variacion > 0 ? '+' : ''}{variacion}% ventas
          </span>
          <span>+50%</span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          step={5}
          value={variacion}
          onChange={(e) => setVariacion(Number(e.target.value))}
          className="w-full accent-teal-deep"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-cream rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display" style={{ color }}>
            {sim.score_general}
          </p>
          <p className="text-xs text-teal mt-0.5">Score</p>
        </div>
        <div className="bg-cream rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display text-teal-deep">
            {sim.dias_cobertura}
          </p>
          <p className="text-xs text-teal mt-0.5">días cobertura</p>
        </div>
        <div className="bg-cream rounded-lg p-3 text-center">
          <p className="text-lg font-bold font-display text-teal-deep">
            {sim.margen_real}%
          </p>
          <p className="text-xs text-teal mt-0.5">margen</p>
        </div>
      </div>

      {variacion <= -20 && sim.dias_cobertura < 30 && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700 font-medium">
            Con esa caída en ventas, tendrías menos de {sim.dias_cobertura} días
            de efectivo. Es el momento de revisar tu plan de contingencia.
          </p>
        </div>
      )}
    </div>
  )
}
