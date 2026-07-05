'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { PulsoScore } from '@/types/database'

interface EvolutionChartProps {
  scores: PulsoScore[]
}

export function EvolutionChart({ scores }: EvolutionChartProps) {
  const data = scores.map((s) => ({
    mes: new Date(s.created_at).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
    Score: s.score_general,
    Liquidez: s.score_liquidez,
    Rentabilidad: s.score_rentabilidad,
    Planeación: s.score_planeacion,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#9AD9CF30" />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: '#0B5E58' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 40, 70, 100]}
          tick={{ fontSize: 11, fill: '#0B5E58' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#F7F5F0',
            border: '1px solid #9AD9CF',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        {/* Zonas de referencia */}
        <ReferenceLine y={70} stroke="#7DC242" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ReferenceLine y={40} stroke="#F5A623" strokeDasharray="4 4" strokeOpacity={0.5} />

        <Line
          type="monotone"
          dataKey="Score"
          stroke="#06403C"
          strokeWidth={2.5}
          dot={{ fill: '#06403C', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line type="monotone" dataKey="Liquidez" stroke="#9AD9CF" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Rentabilidad" stroke="#7DC242" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="Planeación" stroke="#F5A623" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  )
}
