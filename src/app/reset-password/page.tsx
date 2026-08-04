'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'loading' | 'link' | 'otp'

function parseAuthParams() {
  if (typeof window === 'undefined') {
    return { code: null, tokenHash: null, type: null, accessToken: null, refreshToken: null }
  }

  const search = new URLSearchParams(window.location.search)
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashRaw)

  return {
    code: search.get('code') ?? hash.get('code'),
    tokenHash: search.get('token_hash') ?? hash.get('token_hash'),
    type: search.get('type') ?? hash.get('type'),
    accessToken: hash.get('access_token') ?? search.get('access_token'),
    refreshToken: hash.get('refresh_token') ?? search.get('refresh_token'),
  }
}

function hasAuthParams() {
  const p = parseAuthParams()
  return !!(p.code || p.tokenHash || (p.accessToken && p.refreshToken))
}

function cleanAuthUrl() {
  window.history.replaceState({}, document.title, window.location.pathname)
}

function OtpResetForm({
  initialEmail,
  onResend,
}: {
  initialEmail?: string
  onResend: () => void
}) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail ?? '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleEmergencyReset() {
    setError(null)

    if (!email.includes('@')) {
      setError('Ingresa un correo válido.')
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('El código debe tener 6 dígitos.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/emergency-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password }),
      })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        throw new Error(data.error || 'No pudimos actualizar tu contraseña.')
      }

      setDone(true)
      setTimeout(() => {
        router.push('/login')
        router.refresh()
      }, 1800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-green/10 border border-green/30 text-teal-deep text-sm px-4 py-3 rounded-lg text-center">
        Contraseña actualizada. Te llevamos al inicio de sesión…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-lg">
        Usa el código de 6 dígitos que enviamos a tu correo. Funciona en cualquier navegador,
        incluido Hotmail y Safari móvil.
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Correo electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Código de 6 dígitos</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30 tracking-widest text-center text-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite tu contraseña"
          onKeyDown={(e) => e.key === 'Enter' && handleEmergencyReset()}
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleEmergencyReset}
        disabled={loading || !email || !otp || !password || !confirm}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>

      <button
        type="button"
        onClick={onResend}
        className="w-full text-sm text-teal/70 hover:text-teal-deep transition-colors"
      >
        ¿No recibiste el código? Solicitar uno nuevo
      </button>
    </div>
  )
}

function LinkResetForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message || 'No pudimos actualizar tu contraseña.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1800)
  }

  if (done) {
    return (
      <div className="bg-green/10 border border-green/30 text-teal-deep text-sm px-4 py-3 rounded-lg text-center">
        Tu contraseña se actualizó con éxito. Te llevamos a tu tablero…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-teal-deep mb-1.5">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite tu contraseña"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50 text-teal-deep placeholder:text-teal/30 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/30"
        />
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading || !password || !confirm}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cream flex items-center justify-center px-4">
          <div className="text-sm text-teal">Cargando…</div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const presetEmail = searchParams.get('email') ?? undefined
  const [mode, setMode] = useState<Mode>('loading')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!hasAuthParams()) {
        if (!cancelled) setMode('otp')
        return
      }

      const { code, tokenHash, type, accessToken, refreshToken } = parseAuthParams()

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          cleanAuthUrl()
        } else if (tokenHash && type === 'recovery') {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
          if (error) throw error
          cleanAuthUrl()
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          cleanAuthUrl()
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session && !cancelled) {
          setMode('link')
          return
        }
      } catch {
        // Caer al flujo OTP de emergencia.
      }

      if (!cancelled) setMode('otp')
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="Okomos Finanzas" className="h-12 w-auto mb-6 mx-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep">
            Define tu nueva contraseña
          </h1>
          <p className="text-sm text-teal mt-1">
            {mode === 'link'
              ? 'Enlace verificado. Elige tu nueva contraseña.'
              : 'Ingresa el código que enviamos a tu correo.'}
          </p>
        </div>

        <div className="card">
          {mode === 'loading' && (
            <div className="bg-mint/20 border border-mint/40 text-teal-deep text-sm px-4 py-3 rounded-lg text-center">
              Validando enlace…
            </div>
          )}

          {mode === 'link' && <LinkResetForm />}

          {mode === 'otp' && (
            <OtpResetForm
              initialEmail={presetEmail}
              onResend={() => {
                window.location.href = '/forgot-password'
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}
