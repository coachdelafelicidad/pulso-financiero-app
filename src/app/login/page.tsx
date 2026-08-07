'use client'

import { useState, useEffect } from 'react'
import { createClient, syncSessionToCookies } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BiometricLoginButton, useBiometricLoginAvailability } from '@/components/auth/BiometricLoginButton'
import { BIOMETRIC_EMAIL_KEY } from '@/lib/auth/session-config'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

const SITE_URL = 'https://app.okomosfinanzas.com'

export default function LoginPage() {
  const { t } = useLanguage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()
  const showBiometric = useBiometricLoginAvailability(email)

  useEffect(() => {
    const savedEmail = localStorage.getItem(BIOMETRIC_EMAIL_KEY)
    if (savedEmail) setEmail(savedEmail)
  }, [])

  async function finishLogin() {
    await syncSessionToCookies()
    router.push('/dashboard')
    router.refresh()
  }

  async function handleSubmit(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'register') {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
          emailRedirectTo: `${SITE_URL}/dashboard`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      let activeSession = signUpData.session

      if (!activeSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(t('login.error_register'))
          setLoading(false)
          return
        }
        activeSession = signInData.session
      }

      if (activeSession?.user && businessName) {
        await supabase
          .from('profiles')
          .update({ business_name: businessName })
          .eq('id', activeSession.user.id)
      }

      await finishLogin()
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setError(t('login.error_credentials'))
    } else {
      await finishLogin()
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      {/* Language toggle — fixed top-right */}
      <div className="fixed top-4 right-4 z-10">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="Okomos Finanzas" className="h-12 w-auto mb-6 mx-auto" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-teal-deep">
            {mode === 'login' ? t('login.welcome_back') : t('login.create_account')}
          </h1>
          <p className="text-sm text-teal mt-1">
            {mode === 'login' ? t('login.subtitle_login') : t('login.subtitle_register')}
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
                {m === 'login' ? t('login.tab_login') : t('login.tab_register')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} method="post" className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="business-name" className="block text-sm font-medium text-teal-deep mb-1.5">
                  {t('login.business_name')} <span className="text-teal/40">{t('login.optional')}</span>
                </label>
                <input
                  id="business-name"
                  name="organization"
                  type="text"
                  autoComplete="organization"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t('login.business_placeholder')}
                  className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50
                             text-teal-deep placeholder:text-teal/30 focus:outline-none
                             focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-teal-deep mb-1.5">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.email_placeholder')}
                className="w-full px-4 py-2.5 rounded-lg border border-mint/50 bg-cream/50
                           text-teal-deep placeholder:text-teal/30 focus:outline-none
                           focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-teal-deep">
                  {t('login.password')}
                </label>
                {mode === 'login' && (
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-teal/70 transition-colors hover:text-teal-deep"
                  >
                    {t('login.forgot_password')}
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.password_placeholder')}
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-mint/50 bg-cream/50
                             text-teal-deep placeholder:text-teal/30 focus:outline-none
                             focus:border-teal focus:ring-1 focus:ring-teal/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hide_password') : t('login.show_password')}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-teal/50 transition-colors hover:text-teal-deep focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-mint/60 text-teal-deep focus:ring-teal/30"
                />
                <span className="text-sm text-teal-deep/80">
                  {t('login.remember_me')}
                </span>
              </label>
            )}

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
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? t('login.loading')
                : mode === 'login'
                ? t('login.btn_login')
                : t('login.btn_register')}
            </button>

            {mode === 'login' && showBiometric && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-mint/40" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-teal/60">{t('login.quick_access')}</span>
                  </div>
                </div>
                <BiometricLoginButton
                  email={email}
                  onSuccess={() => {
                    router.push('/dashboard')
                    router.refresh()
                  }}
                  onError={setError}
                />
              </>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-teal/50 mt-6">
          {t('login.privacy')}
        </p>
      </div>
    </main>
  )
}
