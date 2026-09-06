import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-[#1B2624] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-teal-deep hover:text-teal-light">
          ← Tu Pulso
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold text-teal-deep">Aviso de privacidad</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#1B2624]/85">
          <p>
            Okomos Finanzas (“nosotros”) opera Tu Pulso en app.okomosfinanzas.com. Recabamos el
            correo, el nombre de tu empresa y los cuatro números que tú capturas cada semana
            (ventas, egresos, efectivo y cobranza) para calcular tu score y mostrarte el tablero.
          </p>
          <p>
            No conectamos tu banco. No vendemos tus datos. El pago lo procesa Stripe; nosotros
            guardamos solo el estado de la suscripción y los identificadores necesarios para
            activar o cancelar el acceso.
          </p>
          <p>
            Puedes solicitar la eliminación de tu cuenta y de tus registros escribiendo a{" "}
            <a className="font-semibold underline" href="mailto:hola@okomosfinanzas.com">
              hola@okomosfinanzas.com
            </a>
            .
          </p>
          <p>Última actualización: septiembre 2026.</p>
        </div>
      </div>
    </main>
  );
}
