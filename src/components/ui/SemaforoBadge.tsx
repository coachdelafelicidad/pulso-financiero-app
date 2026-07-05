import { getSemaforo, SEMAFORO_BG, SEMAFORO_LABELS, Semaforo } from '@/lib/scoring'

interface SemaforoBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export function SemaforoBadge({ score, size = 'md' }: SemaforoBadgeProps) {
  const semaforo = getSemaforo(score)
  const colorClass = SEMAFORO_BG[semaforo]
  const label = SEMAFORO_LABELS[semaforo]

  const sizeClass = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }[size]

  const dotColor = {
    verde: 'bg-green',
    amarillo: 'bg-yellow-400',
    rojo: 'bg-red-500',
  }[semaforo]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${colorClass} ${sizeClass}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  )
}
