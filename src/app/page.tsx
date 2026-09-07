import Link from 'next/link'

const SUBSCRIBE = '/subscribe'
const COMMUNITY_URL =
  process.env.NEXT_PUBLIC_COMMUNITY_URL?.trim() ||
  'https://nas.com/tupulso/join-membership/6a2c795656d1b91a1c12d25e'
const OKOMOS_SITE = 'https://okomosfinanzas.com/'

const PAINS = [
  {
    title: 'El banco se ve bien el lunes',
    body: 'Y el jueves ya no alcanza. El saldo de hoy no te dice si llegas a fin de mes.',
  },
  {
    title: 'Vendiste… pero la lana no está',
    body: 'Está en facturas, en clientes que “ya casi pagan”, en inventario, en la tarjeta.',
  },
  {
    title: 'El contador llega tarde',
    body: 'Cuando ves el reporte, el problema ya pasó. Tú necesitas saberlo esta semana.',
  },
  {
    title: 'Decides con el estómago',
    body: '“Siento que este mes está pesado.” No sabes si el negocio está enfermo o solo fue una semana fea.',
  },
] as const

const NUMBERS = [
  { n: '01', title: 'Cuánto vendiste', hint: 'Lo que facturaste esta semana' },
  { n: '02', title: 'Cuánto gastaste', hint: 'Nómina, renta, proveedores, operación' },
  { n: '03', title: 'Cuánto hay hoy', hint: 'Banco + caja. El número real' },
  { n: '04', title: 'Cuánto te deben', hint: 'La cobranza que todavía no entra' },
] as const

const REVIEWS = [
  {
    quote:
      'Me sentía perdido. Vendía toda la semana y el viernes no sabía si la ferretería iba bien o si nada más se movió el mostrador. Con Tu Pulso anoto cuatro números el domingo y sé exacto dónde estoy. Ya no abro el banco con el corazón en la boca.',
    name: 'Miguel',
    role: 'Dueño de ferretería',
    initials: 'M',
  },
  {
    quote:
      'Entre un proyecto y otro sentía que me iba súper… hasta que el cliente tardaba en pagar el resto. El semáforo me enseñó que el problema no eran las ventas: era lo que me debían. Ahora veo la semana antes de comprometer otro diseño.',
    name: 'Angélica',
    role: 'Diseñadora de interiores',
    initials: 'A',
  },
  {
    quote:
      'En el consultorio todo se siente ocupado: citas, recetas, nómina. Yo no soy de Excel. En cinco minutos el lunes sé si el consultorio respira o si la caja se va a apretar a fin de mes. Eso me quitó un ruido que cargaba todos los días.',
    name: 'Gerónimo',
    role: 'Consultorio médico',
    initials: 'G',
  },
] as const

const READS = [
  {
    title: 'Un semáforo',
    body: 'Verde, amarillo o rojo. ¿Esta semana el negocio respira o se está ahogando?',
  },
  {
    title: 'Una tendencia',
    body: 'No una foto suelta. Ves si la caja mejora, se estanca o va para atrás.',
  },
  {
    title: 'Un simulador',
    body: '“¿Y si las ventas bajan 20%?” Sabes si aguantas el mes — antes del susto, no después.',
  },
] as const

function Cta({
  href,
  children,
  variant = 'primary',
  external = false,
}: {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  external?: boolean
}) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-6 py-3.5 font-display text-base font-semibold transition-colors duration-200'
  const styles =
    variant === 'primary'
      ? `${base} bg-green text-white hover:bg-green/90`
      : `${base} border-2 border-teal-deep bg-transparent text-teal-deep hover:bg-teal-deep hover:text-cream`

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={styles}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={styles}>
      {children}
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-[#1B2624]">
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
        <section className="border-b border-mint/30 bg-teal-deep px-5 py-16 text-cream sm:px-8 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-sm font-medium uppercase tracking-wide text-mint/90">
              Tu Pulso por Okomos
            </p>
            <h1 className="mt-5 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.85rem]">
              ¿Vamos bien, o nada más parece que vamos bien?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-mint/95 sm:text-lg">
              Cuatro números. Un semáforo. Cada semana. En menos de 5 minutos sabes si tu negocio
              respira — o si te estás ahogando en silencio.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3">
              <Cta href={SUBSCRIBE}>Activar mi acceso — $499/mes</Cta>
              <p className="max-w-md text-sm text-mint/80">
                Una semana para probar. Cancela cuando quieras. Sin contratos. Sin conectar banco.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="font-display text-sm font-semibold uppercase tracking-wide text-teal-light">
              El dolor que no se dice en juntas
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              No estás perdido porque no sepas de números. Estás cansado de vivir así.
            </h2>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {PAINS.map((pain) => (
                <li
                  key={pain.title}
                  className="rounded-2xl border border-mint/40 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-display text-lg font-bold text-teal-deep">{pain.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1B2624]/80">{pain.body}</p>
                </li>
              ))}
            </ul>
            <p className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed text-[#1B2624]/80">
              Ese hueco entre “estoy ocupado” y “estoy a salvo” es el que te quita el sueño.
              No es falta de ganas. Es falta de un pulso.
            </p>
          </div>
        </section>

        <section className="border-y border-mint/30 bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="max-w-3xl font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              Cada semana, cuatro números que ya tienes.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#1B2624]/80">
              No conectas el banco. No subes estados de cuenta. No aprendes contabilidad. Los
              anotas y la app te los traduce a algo que un dueño sí puede usar.
            </p>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {NUMBERS.map((item) => (
                <li
                  key={item.n}
                  className="rounded-2xl border border-mint/40 bg-cream p-5"
                >
                  <p className="font-display text-xs font-semibold tracking-widest text-teal-light">
                    {item.n}
                  </p>
                  <h3 className="mt-2 font-display text-base font-bold text-teal-deep">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-[#1B2624]/70">{item.hint}</p>
                </li>
              ))}
            </ol>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {READS.map((item) => (
                <li key={item.title}>
                  <h3 className="font-display text-lg font-bold text-teal-deep">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#1B2624]/80">{item.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-2xl font-display text-lg font-semibold text-teal-deep">
              No te da un balance. Te da una lectura de si tu negocio tiene gasolina.
            </p>
          </div>
        </section>

        <section className="bg-teal-deep px-5 py-16 text-cream sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              El contador te dice qué pasó. El banco, cuánto hay hoy.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-mint/95">
              Tú necesitas saber hacia dónde vas esta semana. Un negocio no se muere el día que
              se acaba el dinero. Se muere 4 o 6 semanas antes, cuando nadie vio que la cobranza
              se atascó y el gasto se quedó alto.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-mint/95">
              Tu Pulso es el check-up semanal. Como tomarte la presión: te dice si hoy estás
              bien, si hay que vigilar, o si hay que actuar.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <span className="rounded-full bg-[#7DC242] px-4 py-2 font-display text-sm font-semibold text-white">
                Verde · respira
              </span>
              <span className="rounded-full bg-[#F5A623] px-4 py-2 font-display text-sm font-semibold text-teal-deep">
                Amarillo · vigila
              </span>
              <span className="rounded-full bg-[#E53E3E] px-4 py-2 font-display text-sm font-semibold text-white">
                Rojo · actúa
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <blockquote className="rounded-2xl border border-mint/40 bg-white p-7 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-light">Antes</p>
              <p className="mt-3 font-display text-xl font-semibold leading-snug text-teal-deep">
                “Vendimos, pero no sé por qué no hay lana.”
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#1B2624]/75">
                Decides con miedo o con euforia. Excel lo abres con culpa. Lo dejas hasta el
                siguiente susto.
              </p>
            </blockquote>
            <blockquote className="rounded-2xl border border-green/40 bg-white p-7 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-light">Después</p>
              <p className="mt-3 font-display text-xl font-semibold leading-snug text-teal-deep">
                “El semáforo se puso amarillo. Ya sé qué mover.”
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#1B2624]/75">
                Esta semana nos deben de más y el gasto no bajó. Decides con un pulso, no con el
                estómago.
              </p>
            </blockquote>
          </div>
        </section>

        <section className="border-y border-mint/30 bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="font-display text-sm font-semibold uppercase tracking-wide text-teal-light">
              Dueños como tú
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              Dejaron de adivinar. Ahora saben en qué semana están.
            </h2>
            <ul className="mt-10 grid gap-6 lg:grid-cols-3">
              {REVIEWS.map((review) => (
                <li
                  key={review.name}
                  className="flex flex-col rounded-2xl border border-mint/40 bg-cream p-6"
                >
                  <p className="flex-1 text-sm leading-relaxed text-[#1B2624]/90">
                    “{review.quote}”
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-mint/40 pt-5">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-deep font-display text-sm font-bold text-cream"
                      aria-hidden
                    >
                      {review.initials}
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold text-teal-deep">
                        {review.name}
                      </p>
                      <p className="text-xs text-[#1B2624]/65">{review.role}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="font-display text-2xl font-bold text-teal-deep sm:text-3xl">
                Es para ti si el negocio depende de ti.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#1B2624]/85">
                Dueño de PyME en México. Facturas. Tienes gente. A veces le das crédito al
                cliente. No tienes un director de finanzas a tu lado. No quieres un ERP. Quieres
                claridad el domingo o el lunes, en 5 minutos, y seguir operando.
              </p>
              <p className="mt-4 text-base leading-relaxed text-[#1B2624]/85">
                Panadería, agencia, despacho, clínica, taller, comercio, servicios. Si el dinero
                entra y sale cada semana y tú eres el que firma, esto es para ti.
              </p>
            </div>
            <div className="rounded-2xl border border-mint/40 bg-white p-7 shadow-sm">
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-teal-light">
                No es para
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#1B2624]/80">
                <li>Quien quiere que la app “le lleve la contabilidad”.</li>
                <li>Quien nunca va a anotar un número.</li>
                <li>Quien busca un reemplazo del SAT o del contador.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-mint/50 bg-white p-8 sm:p-10 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
                <div>
                  <h2 className="font-display text-2xl font-bold text-teal-deep sm:text-3xl">
                    Cuando ya no solo quieras ver el número.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#1B2624]/90">
                    El App te dice qué está pasando. La Comunidad PRO en Nas.com te ayuda a
                    entender qué hacer: sesiones en vivo dos veces al mes con Mario, grabaciones
                    y un espacio para resolver dudas con él.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-[#1B2624]/90">
                    Son dos productos independientes. Puedes usar el App solo, o complementarlo
                    cuando quieras ir más a fondo.
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
                  <Cta href={COMMUNITY_URL} variant="secondary" external>
                    Conocer la Comunidad PRO
                  </Cta>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-teal-deep sm:text-3xl">
              El primer paso no es volverte experto. Es dejar de adivinar.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#1B2624]/85">
              Tú no necesitas más reportes. Necesitas saber, cada semana, si tu negocio está
              sano. $499 al mes. Sin banco. Sin contrato. Cancela cuando quieras.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Cta href={SUBSCRIBE}>Activar mi acceso — $499/mes</Cta>
              <Link
                href="/login"
                className="font-display text-base font-semibold text-teal-deep underline-offset-4 transition-colors hover:text-teal-light hover:underline"
              >
                Iniciar sesión
              </Link>
              <p className="text-sm text-[#1B2624]/65">
                ¿Ya compraste? Entra con el correo que usaste al pagar.
              </p>
            </div>
          </div>
        </section>
      </main>

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
            © {new Date().getFullYear()} Okomos Finanzas · Tu Pulso por Okomos ·{" "}
            <Link href="/privacidad" className="underline underline-offset-2 hover:text-mint">
              Privacidad
            </Link>
            {" · "}
            <Link href="/terminos" className="underline underline-offset-2 hover:text-mint">
              Términos
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
