'use client'

// SONA login: SAM's login LAYOUT (centered avatar, Welcome Back, Google +
// Microsoft SSO, email + password inline, forgot password, trial CTA) rendered
// in Sona's own warm-ivory + Pine theme. Same providers and flow as SAM
// (Supabase signInWithOAuth / signInWithPassword) plus a magic-link fallback
// kept as an understated secondary option.

import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@/lib/router-shim'
import { Mail, Check, Loader2, LockKeyhole, Apple, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ENABLE_APPLE_LOGIN = process.env.NEXT_PUBLIC_ENABLE_APPLE_LOGIN === 'true'

function safeReturnPath(value: string | null | undefined, fallback = '/spaces') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

// Brand glyphs (inline so we don't pull an icon dep for two logos).
function GoogleG() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export default function Login() {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [loading, setLoading] = useState<null | 'google' | 'azure' | 'apple' | 'email' | 'password' | 'reset'>(null)
  const [error, setError] = useState('')
  const locationState = location.state as unknown as { from?: unknown } | null
  const stateFrom = typeof locationState?.from === 'string'
    ? locationState.from
    : null
  const queryFrom = new URLSearchParams(window.location.search).get('next')
  const from = safeReturnPath(queryFrom ?? stateFrom)
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(from)}`

  useEffect(() => {
    let active = true

    const nextFromQuery = safeReturnPath(new URLSearchParams(window.location.search).get('next') ?? from)
    const goNext = () => {
      if (active) navigate(nextFromQuery, { replace: true })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) goNext()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [from, navigate])

  async function oauth(provider: 'google' | 'azure' | 'apple') {
    setError(''); setLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        // No offline_access for azure: we do not call Microsoft Graph, and its
        // provider refresh token bloats the session cookie enough to chunk and
        // trip the middleware cookie-size guard, which broke Microsoft sign-in.
        scopes: provider === 'azure' ? 'openid email profile' : 'email profile',
      },
    })
    // On success the browser redirects to the provider; on error, surface it.
    if (error) { setError(error.message); setLoading(null) }
  }

  async function emailLink() {
    if (!email.trim()) { setError('Enter your email first.'); return }
    setError(''); setLoading('email')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })
    if (error) { setError(error.message); setLoading(null) }
    else { setSent(true); setLoading(null) }
  }

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError(''); setLoading('password')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }
    navigate(from, { replace: true })
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError('Enter your email first.')
      return
    }
    setError(''); setResetSent(false); setLoading('reset')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(null)
  }

  const busy = !!loading

  const ssoBtn: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 46, borderRadius: 'var(--radius-md)', border: '1px solid var(--line-2)',
    background: 'var(--surface)', color: 'var(--ink)', fontSize: 14, fontWeight: 500,
    fontFamily: 'var(--font-body)', cursor: busy ? 'default' : 'pointer', transition: 'background 120ms ease',
  }
  const fieldWrap: React.CSSProperties = { position: 'relative' }
  const fieldInput: React.CSSProperties = {
    width: '100%', height: 46, paddingLeft: 40, paddingRight: 14, fontSize: 14,
    fontFamily: 'var(--font-body)', color: 'var(--ink)', background: 'var(--paper-warm)',
    border: '1px solid var(--line-2)', borderRadius: 'var(--radius-md)', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 120ms ease, box-shadow 120ms ease',
  }
  const iconLeft: React.CSSProperties = {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)',
  }
  const linkBtn: React.CSSProperties = {
    border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 13,
    fontWeight: 600, fontFamily: 'var(--font-body)', cursor: busy ? 'default' : 'pointer', padding: 0,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--paper)' }}>
      <style>{`
        .sona-in::placeholder { color: var(--faint); }
        .sona-in:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint); }
        .sona-sso:hover:not(:disabled) { background: var(--fog); }
        .sona-primary:hover:not(:disabled) { filter: brightness(1.06); }
        .sona-link:hover { color: var(--accent-soft); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-pop)', padding: 32 }}>
          {/* Header: avatar + Welcome Back */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img
              src="/vera-avatar.png"
              alt="Sona"
              style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', background: 'var(--accent)', display: 'block', margin: '0 auto 16px', boxShadow: 'var(--shadow-pop)' }}
            />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', margin: '0 0 6px' }}>
              {sent ? 'Check your inbox' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: 13.5, color: 'var(--ghost)', margin: 0, lineHeight: 1.5 }}>
              {sent
                ? <>Magic link sent to <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{email}</span>. Click it to sign in.</>
                : 'Sign in to your Sona workspace'}
            </p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-tint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Check size={22} style={{ color: 'var(--accent)' }} />
              </span>
              <div>
                <button onClick={() => { setSent(false); setError('') }} className="sona-link" style={{ ...linkBtn, marginTop: 12 }}>Back to sign in</button>
              </div>
            </div>
          ) : (
            <>
              {/* Social */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => oauth('google')} disabled={busy} className="sona-sso" style={{ ...ssoBtn, opacity: busy && loading !== 'google' ? 0.5 : 1 }}>
                  {loading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleG />} Continue with Google
                </button>
                <button onClick={() => oauth('azure')} disabled={busy} className="sona-sso" style={{ ...ssoBtn, opacity: busy && loading !== 'azure' ? 0.5 : 1 }}>
                  {loading === 'azure' ? <Loader2 size={16} className="animate-spin" /> : <MicrosoftLogo />} Continue with Microsoft
                </button>
                {ENABLE_APPLE_LOGIN && (
                  <button onClick={() => oauth('apple')} disabled={busy} className="sona-sso" style={{ ...ssoBtn, opacity: busy && loading !== 'apple' ? 0.5 : 1 }}>
                    {loading === 'apple' ? <Loader2 size={16} className="animate-spin" /> : <Apple size={17} />} Continue with Apple
                  </button>
                )}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>or sign in with email</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              </div>

              {/* Email + password */}
              <form onSubmit={passwordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={fieldWrap}>
                  <Mail size={16} style={iconLeft} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoComplete="email"
                    className="sona-in" style={fieldInput}
                  />
                </div>
                <div style={fieldWrap}>
                  <LockKeyhole size={16} style={iconLeft} />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" autoComplete="current-password"
                    className="sona-in" style={{ ...fieldInput, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--faint)', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={busy} className="sona-primary" style={{ height: 46, marginTop: 2, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14.5, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-glow)', transition: 'filter 120ms ease' }}>
                  {loading === 'password' ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sign in
                </button>
              </form>

              {error && <p style={{ marginTop: 14, marginBottom: 0, fontSize: 12.5, color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}

              {/* Footer actions */}
              <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={sendPasswordReset} disabled={busy} className="sona-link" style={linkBtn}>
                  {loading === 'reset' ? 'Sending...' : resetSent ? 'Reset email sent' : 'Forgot your password?'}
                </button>
                <button type="button" onClick={emailLink} disabled={busy} className="sona-link" style={{ ...linkBtn, color: 'var(--ghost)', fontWeight: 500 }}>
                  {loading === 'email' ? 'Sending...' : 'Email me a magic link instead'}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)', marginTop: 18 }}>
          One sign-in for SONA and InnovareAI apps.
        </p>
      </div>
    </div>
  )
}
