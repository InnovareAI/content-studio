'use client'

// OAuth / magic-link / recovery callback, handled in the browser.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export default function AuthCallback() {
  const ran = useRef(false)
  const [message, setMessage] = useState('Signing you in...')

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    // Read the query straight from the URL (no useSearchParams, which would
    // force a Suspense boundary). This component only ever runs in the browser.
    const params = new URLSearchParams(window.location.search)
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const code = params.get('code')
    const next = safeNext(params.get('next'))
    const oauthError = fragment.get('error') ?? params.get('error')
    const oauthErrorDescription =
      fragment.get('error_description') ?? params.get('error_description')
    const hasImplicitTokens = fragment.has('access_token')
    let timer: ReturnType<typeof setTimeout> | undefined
    let unsubscribe = () => {}
    let settled = false

    const cleanUp = () => {
      if (timer) clearTimeout(timer)
      unsubscribe()
    }

    const fail = (reason: string, detail?: string | null) => {
      if (settled) return
      settled = true
      cleanUp()
      const q = new URLSearchParams({ error: reason })
      if (detail) q.set('detail', detail.slice(0, 160))
      window.location.assign(`/login?${q.toString()}`)
    }

    const finalizeAndGo = async () => {
      // Drop the bulky provider tokens before leaving. We never call the
      // provider's own API, and azure tokens are large enough to chunk the
      // session cookie past the middleware size guard, which then wipes the
      // auth cookies on the next navigation and bounces the user to login.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && (session.provider_token || session.provider_refresh_token)) {
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        }
      } catch {
        // Non-fatal: proceed with the session as stored.
      }
      window.location.assign(next)
    }

    const succeed = () => {
      if (settled) return
      settled = true
      cleanUp()
      setMessage('Success. Redirecting...')
      void finalizeAndGo()
    }

    const waitForSession = (timeoutMs: number, timeoutReason: string) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session) succeed()
        },
      )
      unsubscribe = () => subscription.unsubscribe()
      timer = setTimeout(() => fail(timeoutReason), timeoutMs)

      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) succeed()
      })
    }

    async function run() {
      if (oauthError || oauthErrorDescription) {
        fail('oauth', oauthErrorDescription ?? oauthError)
        return
      }

      if (hasImplicitTokens) {
        waitForSession(10_000, 'timeout')
        return
      }

      if (code) {
        // Do NOT exchange manually. createBrowserClient force-enables
        // detectSessionInUrl, so supabase-js is already exchanging this code in
        // the background at client init. A second manual exchange races it,
        // consumes the one-time PKCE verifier, and kills both attempts. Wait
        // for the session the automatic exchange produces instead.
        waitForSession(10_000, 'exchange')
        return
      }

      // No tokens and no code visible. detectSessionInUrl may have already
      // consumed and stripped the fragment before this effect ran, so wait
      // briefly for the session instead of failing outright.
      waitForSession(3_000, 'nocode')
    }

    void run()

    return cleanUp
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        color: 'var(--ghost)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
      }}
    >
      {message}
    </div>
  )
}
