'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'register') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
        },
      })
      if (signUpError) {
        setError(signUpError.message)
      } else {
        // Update business_name in profiles
        const { data: { user } } = await supabase.auth.getUser()
        if (user && businessName) {
          await supabase
            .from('profiles')
            .update({ business_name: businessName })
            .eq('id', user.id)
        }
        setMessage('Revisa tu correo para confirmar tu cuenta.')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError('Correo o contraseña incorrectos.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-deep flex items-center justify-center">
              <span className="text-mint font-display font-bold">P</span>
            </div>
            <span className="font-display font-semibold text-teal-deep text-lg">Pulso Financiero</span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep">
            {mode === 'login' ? 'Bienvenido de regreso' : 'Crea tu cuenta'}
          </h1>
          <p className="text-sm text-teal mt-1">
            {mode === 'login'
              ? 'Ingresa para ver tu Score actualizado.'
              : 'Empieza a medir la salud de tu empresa.'}
          </p>
        </div>

        <div className="card">
          <div className="flex rounded-lg bg-cream p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m
                    ? 'bg-white text-teal-deep shadow-sm'
                    : 'text-teal hover:text-teal-deep'
                }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-teal-deep mb-1.5">
                  Nombre de tu empresa <span className="text-teal/40">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Distribuidora García S.A."
                  className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50
                             text-teal-deep placeholder:text-teal/30 focus:outline-none
                             focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-teal-deep mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50
                           text-teal-deep placeholder:text-teal/30 focus:outline-none
                           focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-teal-deep mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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

            {message && (
              <div className="bg-green/10 border border-green/30 text-teal-deep text-sm px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Un momento...'
                : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-teal/50 mt-6">
          Al registrarte aceptas el uso de tus datos solo para generar tu Score.
          No compartimos información con terceros.
        </p>
      </div>
    </main>
  )
}
