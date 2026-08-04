import Link from 'next/link'

const STRIPE_CHECKOUT = 'https://buy.stripe.com/4gM4graxv5914i47kJ8ww00'
const NASIO_COMMUNITY = 'https://nas.com/pulsofinanciero'
const OKOMOS_SITE = 'https://okomosfinanzas.com/'

const FEATURES = [
  {
    title: 'Cuatro indicadores a la semana',
    body: 'Registra Ventas, Gastos, Efectivo y Cobranza. Son los números que definen si tu negocio respira bien.',
  },
  {
    title: 'Score con semáforo',
    body: 'Un puntaje de salud financiera con verde, amarillo o rojo. Sabes de un vistazo dónde estás parado.',
  },
  {
    title: 'Tendencia semana a semana',
    body: 'Gráficas de histórico para ver si tu caja mejora, se estanca o retrocede con el tiempo.',
  },
  {
    title: 'Simulador integrado',
    body: '¿Qué pasa si tus ventas bajan 20 %? Calculas cuánto tiempo aguanta tu negocio antes de apretar.',
  },
] as const

function ExternalCta({
  href,
  children,
  variant = 'primary',
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-6 py-3.5 font-display text-base font-semibold transition-colors duration-200'
  const styles =
    variant === 'primary'
      ? `${base} bg-green text-white hover:bg-green/90`
      : `${base} border-2 border-teal-deep bg-transparent text-teal-deep hover:bg-teal-deep hover:text-cream`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={styles}>
      {children}
    </a>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-[#1B2624]">
      {/* Header */}
      <header className="border-b border-mint/40 bg-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Okomos Finanzas" className="h-10 w-auto sm:h-11" />
          </Link>
          <Link
            href="/login"
            className="font-display text-sm font-semibold text-teal-deep transition-colors hover:text-teal-light sm:text-base"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-mint/30 bg-teal-deep px-5 py-16 text-cream sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-sm font-medium uppercase tracking-wide text-mint/90">
              Pulso Financiero
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
              Mide el Pulso de tu empresa, semana a semana.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-mint/95 sm:text-lg">
              Cuatro números cada semana. En menos de 5 minutos sabes si tu liquidez, tu margen y tu
              cobranza van en la dirección correcta — o si necesitas actuar antes de que sea
              urgente.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <ExternalCta href={STRIPE_CHECKOUT}>Activar mi acceso — $499/mes</ExternalCta>
              <p className="max-w-md text-sm text-mint/80">
                Cancela cuando quieras. Sin contratos. Sin conectar banco.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              Lo que incluye tu tablero
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-[#1B2624]/80">
              Registro manual y privado. Tú capturas tus cifras; el sistema te ayuda a leerlas.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  className="rounded-2xl border border-mint/40 bg-white p-6 shadow-sm"
                >
                  <span
                    className="mb-4 inline-block h-2 w-10 rounded-full bg-green"
                    aria-hidden
                  />
                  <h3 className="font-display text-lg font-bold text-teal-deep">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1B2624]/85">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comunidad PRO */}
        <section className="border-y border-mint/30 bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-mint/50 bg-cream p-8 sm:p-10 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                <div>
                  <h2 className="font-display text-2xl font-bold text-teal-deep sm:text-3xl">
                    No te quedes solo con los números — aprende a leerlos.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#1B2624]/90">
                    El App te dice qué está pasando con tu negocio, semana a semana. La Comunidad
                    PRO en Nas.com te ayuda a entender qué hacer con esa información: sesiones en
                    vivo por Zoom dos veces al mes con Mario, un catálogo de sesiones grabadas, y
                    un espacio para resolver dudas directamente con él.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-[#1B2624]/90">
                    Son dos productos independientes — puedes usar el App por su cuenta, o
                    complementarlo con la Comunidad cuando quieras ir más a fondo en cómo tomar
                    mejores decisiones financieras.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-4 lg:items-stretch">
                  <ul className="w-full space-y-3 text-sm text-[#1B2624]/85">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" aria-hidden />
                      Dos sesiones en vivo al mes con Mario
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" aria-hidden />
                      Biblioteca de sesiones grabadas
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green" aria-hidden />
                      Espacio para dudas entre sesiones
                    </li>
                  </ul>
                  <ExternalCta href={NASIO_COMMUNITY} variant="secondary">
                    Conocer la Comunidad PRO
                  </ExternalCta>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              Empieza con cuatro números esta semana
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#1B2624]/85">
              Activa tu acceso, entra a tu tablero y registra tu primera semana cuando estés listo.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <ExternalCta href={STRIPE_CHECKOUT}>Activar mi acceso — $499/mes</ExternalCta>
              <Link
                href="/login"
                className="font-display text-base font-semibold text-teal-deep underline-offset-4 transition-colors hover:text-teal-light hover:underline"
              >
                Iniciar sesión
              </Link>
              <p className="text-sm text-[#1B2624]/65">¿Ya compraste? Entra con el correo que usaste al pagar.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mint/30 bg-teal-deep px-5 py-10 text-cream sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm leading-relaxed text-mint/90">
            ¿Buscas dirección financiera completa para tu empresa?{' '}
            <a
              href={OKOMOS_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline underline-offset-4 transition-colors hover:text-mint"
            >
              Conoce nuestros servicios de CFO Externo en okomosfinanzas.com
            </a>
          </p>
          <p className="mt-6 text-xs text-mint/60">
            © {new Date().getFullYear()} Okomos Finanzas · Pulso Financiero
          </p>
        </div>
      </footer>
    </div>
  )
}
