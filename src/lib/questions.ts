export interface QuizOption {
  value: 1 | 2 | 3 | 4
  label: string
}

export interface QuizQuestion {
  id: keyof import('./scoring').QuizAnswers
  category: 'liquidez' | 'rentabilidad' | 'planeacion'
  text: string
  options: QuizOption[]
  contextNote: Record<1 | 2, string> // Mensaje cuando elige opción 1 o 2
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    category: 'liquidez',
    text: 'Sin ver tu app del banco: ¿cuánto dinero tienes disponible hoy, en números redondos?',
    options: [
      { value: 1, label: 'No tengo idea' },
      { value: 2, label: 'Tengo una idea aproximada' },
      { value: 3, label: 'Lo sé con bastante precisión' },
      { value: 4, label: 'Lo sé exacto — lo reviso todos los días' },
    ],
    contextNote: {
      1: 'Operar sin saber cuánto efectivo tienes es como manejar sin velocímetro. Puede funcionar un tiempo, pero los baches duelen doble.',
      2: 'Una idea aproximada ayuda, pero las decisiones grandes — contratar, invertir, pagar — necesitan números reales.',
    },
  },
  {
    id: 'q2',
    category: 'liquidez',
    text: 'Con ese efectivo y tu gasto actual, ¿hasta qué día del mes que viene aguanta tu negocio si no entra ni un peso más?',
    options: [
      { value: 1, label: 'No sabría calcularlo' },
      { value: 2, label: 'Menos de 15 días' },
      { value: 3, label: 'Entre 15 y 30 días' },
      { value: 4, label: 'Más de 30 días — lo tengo calculado' },
    ],
    contextNote: {
      1: 'Este cálculo es el termómetro básico de cualquier negocio. Si no lo tienes, cualquier mes puede convertirse en una emergencia.',
      2: 'Menos de 15 días de cobertura es zona de riesgo real. Un cliente que paga tarde o una venta que no cierra puede crear un hueco serio.',
    },
  },
  {
    id: 'q3',
    category: 'rentabilidad',
    text: 'De cada $100 que vendes, ¿cuánto te queda realmente después de TODOS los gastos?',
    options: [
      { value: 1, label: 'No tengo idea' },
      { value: 2, label: 'Tengo una suposición — nunca lo calculé' },
      { value: 3, label: 'Tengo una cifra, aunque no estoy 100% seguro' },
      { value: 4, label: 'Lo calculo cada mes' },
    ],
    contextNote: {
      1: 'Sin margen real, no sabes si estás ganando o perdiendo. Las ventas altas con margen desconocido son la historia detrás de muchos negocios que "vendían mucho" pero quebraron.',
      2: 'Una suposición te puede llevar a aceptar proyectos o precios que en realidad te cuestan dinero.',
    },
  },
  {
    id: 'q4',
    category: 'rentabilidad',
    text: '¿Cuánto te deben tus clientes que aún no te han pagado?',
    options: [
      { value: 1, label: 'No llevo ese control' },
      { value: 2, label: 'Sé que hay cartera pendiente, pero no sé cuánto' },
      { value: 3, label: 'Tengo una idea aproximada del monto' },
      { value: 4, label: 'Sé exactamente cuánto me deben y desde cuándo' },
    ],
    contextNote: {
      1: 'La cartera no cobrada es dinero tuyo que está trabajando para otros. Sin control, crece sola.',
      2: 'Saber que existe el problema no es lo mismo que resolverlo. La cartera sin nombre ni monto es invisible para tu flujo de efectivo.',
    },
  },
  {
    id: 'q5',
    category: 'planeacion',
    text: 'Si tus ventas bajaran 20% el próximo trimestre, ¿sabrías en cuánto tiempo tendrías un problema de efectivo?',
    options: [
      { value: 1, label: 'No — nunca lo he calculado' },
      { value: 2, label: 'Tendría una intuición, no un cálculo' },
      { value: 3, label: 'Podría estimarlo si me poniera a pensar' },
      { value: 4, label: 'Ya tengo ese escenario proyectado' },
    ],
    contextNote: {
      1: 'Las crisis no avisan. La diferencia entre un susto y un cierre suele ser haber calculado esto antes.',
      2: 'Intuición vs. proyección es la diferencia entre reaccionar y anticipar. Las dos no cuestan lo mismo.',
    },
  },
  {
    id: 'q6',
    category: 'planeacion',
    text: 'Tu cliente más grande, ¿qué porcentaje de tus ventas totales representa?',
    options: [
      { value: 1, label: 'No lo he calculado' },
      { value: 2, label: 'Es alto, pero no sé el número exacto' },
      { value: 3, label: 'Tengo una idea aproximada del porcentaje' },
      { value: 4, label: 'Lo sé con precisión — y lo vigilo de cerca' },
    ],
    contextNote: {
      1: 'Si un cliente concentra más del 30% de tus ventas y se va, tu empresa lo resiente de forma inmediata. Conocer ese número es gestión básica de riesgo.',
      2: 'Saber que la concentración es alta sin medirla es como saber que hay humo sin buscar el fuego.',
    },
  },
]

export const CATEGORY_LABELS: Record<string, string> = {
  liquidez: 'Liquidez',
  rentabilidad: 'Rentabilidad',
  planeacion: 'Planeación',
}
