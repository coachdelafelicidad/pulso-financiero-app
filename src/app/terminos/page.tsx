import Link from "next/link";

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-cream px-5 py-16 text-[#1B2624] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-teal-deep hover:text-teal-light">
          ← Tu Pulso
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold text-teal-deep">Términos de uso</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#1B2624]/85">
          <p>
            Tu Pulso es una herramienta de seguimiento semanal. No es asesoría fiscal, contable ni
            una recomendación de inversión. Las cifras las capturas tú; el score es una lectura
            orientativa de esos números.
          </p>
          <p>
            La suscripción cuesta $499 MXN al mes, se cobra con Stripe y se renueva automáticamente
            hasta que la canceles. Puedes cancelar cuando quieras desde “Administrar suscripción”
            en tu tablero. El acceso premium termina al finalizar el periodo ya pagado.
          </p>
          <p>
            Incluye una semana de prueba: puedes registrar un pulso sin pagar. Las semanas
            siguientes requieren suscripción activa.
          </p>
          <p>
            Al crear una cuenta aceptas este aviso y el{" "}
            <Link href="/privacidad" className="font-semibold underline">
              aviso de privacidad
            </Link>
            .
          </p>
          <p>Última actualización: septiembre 2026.</p>
        </div>
      </div>
    </main>
  );
}
