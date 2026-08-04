'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/request-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json()) as { error?: string; message?: string }

      if (!res.ok) {
        throw new Error(data.error || 'No pudimos enviar el código.')
      }

      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar el código.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="Okomos Finanzas" className="h-12 w-auto mb-6 mx-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep">
            Recupera tu acceso
          </h1>
          <p className="text-sm text-teal mt-1">
            Te enviaremos un código de 6 dígitos para restablecer tu contraseña.
          </p>
        </div>

        <div className="card">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="bg-green/10 border border-green/30 text-teal-deep text-sm px-4 py-3 rounded-lg">
                Si <span className="font-semibold">{email}</span> está registrado, recibirás un
                código de 6 dígitos en tu bandeja de entrada.
              </div>
              <p className="text-xs text-teal/60">
                Revisa también spam. El código expira en 15 minutos.
              </p>
              <Link href="/reset-password" className="btn-primary w-full block text-center">
                Ir a cambiar contraseña
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-deep mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  onKeyDown={(e) => e.key === 'Enter' && email && handleSubmit()}
                  className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50
                             text-teal-deep placeholder:text-teal/30 focus:outline-none
                             focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando código…' : 'Enviar código de verificación'}
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-sm font-medium text-teal/70 transition-colors hover:text-teal-deep"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </main>
  )
}
