import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-deep flex items-center justify-center">
            <span className="text-mint font-display font-bold text-sm">P</span>
          </div>
          <span className="font-display font-semibold text-teal-deep">Pulso Financiero</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-teal hover:text-teal-deep transition-colors"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <p className="inline-block text-sm font-medium text-teal bg-mint/20 px-4 py-1.5 rounded-full mb-6">
          Por Okomos Finanzas
        </p>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-teal-deep leading-tight mb-6">
          ¿Tu empresa está sana<br />
          <span className="text-green">financieramente?</span>
        </h1>
        <p className="text-lg text-teal max-w-xl mx-auto mb-10 leading-relaxed">
          Captura 4 números una vez al mes. En menos de 5 minutos sabes
          exactamente dónde está tu liquidez, tu margen real y tu riesgo —
          sin conectar banco ni hablar con tu contador.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="btn-primary text-base px-8 py-4">
            Empieza gratis
          </Link>
          <Link href="https://okomosfinanzas.com/pulso-quiz.html" className="btn-secondary text-base px-8 py-4">
            Ver el quiz gratuito
          </Link>
        </div>
        <p className="text-sm text-teal/60 mt-4">
          Plan mensual: $499 MXN/mes · Cancela cuando quieras
        </p>
      </section>

      {/* Qué obtienes */}
      <section className="bg-white py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-teal-deep text-center mb-4">
            Lo que cambia con Pulso
          </h2>
          <p className="text-center text-teal mb-12 max-w-lg mx-auto">
            Cuatro números al mes. Una imagen clara de tu negocio.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-teal-deep mb-2">{f.title}</h3>
                <p className="text-sm text-teal leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20 max-w-4xl mx-auto px-6">
        <h2 className="font-display text-3xl font-bold text-teal-deep text-center mb-12">
          Tres pasos, una vez al mes
        </h2>
        <div className="space-y-8">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-deep/5 border border-mint
                              flex items-center justify-center font-display font-bold text-teal-deep">
                {i + 1}
              </div>
              <div>
                <h3 className="font-display font-semibold text-teal-deep mb-1">{step.title}</h3>
                <p className="text-teal leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Para quién */}
      <section className="bg-teal-deep py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-cream mb-6">
            Para dueños de PyMEs que ya venden bien<br />pero sienten que el dinero no alcanza
          </h2>
          <p className="text-mint text-lg mb-10">
            Si tienes entre $50,000 y $5,000,000 MXN en ventas al mes y operas
            solo con un contador para cumplimiento fiscal, Pulso te da la capa
            estratégica que falta.
          </p>
          <Link href="/login" className="btn-primary">
            Conoce tu Score hoy
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-teal/50 border-t border-mint/20">
        <p>Pulso Financiero es un producto de{' '}
          <a href="https://okomosfinanzas.com" className="text-teal hover:text-teal-deep transition-colors">
            Okomos Finanzas
          </a>
          {' '}· Mario Alberto Mojica Marín · CFO Externo</p>
      </footer>
    </main>
  )
}

const FEATURES = [
  {
    icon: '🟢',
    title: 'Score con semáforo',
    desc: 'Tu salud financiera en un número (0-100) y tres colores. Sin jerga. Sin que tengas que interpretar nada.',
  },
  {
    icon: '📈',
    title: 'Historial mes a mes',
    desc: 'Ve si vas mejorando o empeorando con el tiempo. El contexto importa tanto como el número de hoy.',
  },
  {
    icon: '⚠️',
    title: 'Alertas antes del problema',
    desc: 'Si algún indicador entra en zona roja, te avisamos por correo antes de que se convierta en emergencia.',
  },
  {
    icon: '🧮',
    title: 'Calculadora de cobertura',
    desc: '¿Cuántos días aguanta tu negocio si no entra un peso más? Lo calculamos automáticamente.',
  },
  {
    icon: '📉',
    title: 'Simulador de escenarios',
    desc: '¿Qué pasa si tus ventas bajan 20%? ¿O si subes precios? Explora antes de decidir.',
  },
  {
    icon: '🤝',
    title: 'CFO humano disponible',
    desc: 'Si tu Score sugiere que necesitas más que la app, Mario Mojica puede acompañarte de forma directa.',
  },
]

const STEPS = [
  {
    title: 'Captura tus 4 números',
    desc: 'Ventas del mes, gastos operativos, efectivo disponible y lo que te deben clientes. Nada más.',
  },
  {
    title: 'Revisa tu Score y semáforo',
    desc: 'Liqudez, Rentabilidad y Planeación — cada uno con su color. Sabes exactamente dónde poner el ojo.',
  },
  {
    title: 'Compara con el mes anterior',
    desc: 'La gráfica de evolución te muestra si vas en la dirección correcta. La mejora se vuelve visible.',
  },
]
