'use client'

// OAuth / magic-link / recovery callback, handled in the BROWSER.
//
// Why client-side: the PKCE code-verifier is written by the browser client as a
// cookie on this origin, but on an OAuth return it is not sent to the server on
// the callback request (that request is the tail of a cross-site redirect
// through the provider, so the verifier cookie stays in the browser and the
// server sees zero auth cookies). Exchanging the code here reads the verifier
// straight from the browser's own cookie store, which always has it, then the
// session cookies it writes are picked up by the middleware on the next
// navigation.

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
    const code = params.get('code')
    const next = safeNext(params.get('next'))
    const oauthError = params.get('error')
    const oauthErrorDescription = params.get('error_description')

    const fail = (reason: string, detail?: string | null) => {
      const q = new URLSearchParams({ error: reason })
      if (detail) q.set('detail', detail.slice(0, 160))
      window.location.assign(`/login?${q.toString()}`)
    }

    async function run() {
      if (oauthError) {
        fail('oauth', `${oauthError}: ${oauthErrorDescription ?? ''}`)
        return
      }
      if (!code) {
        fail('nocode')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        fail('exchange', error.message)
        return
      }

      // Session cookies are set. Use a full navigation so the middleware sees
      // them and routes the authenticated user into the workspace.
      setMessage('Success. Redirecting...')
      window.location.assign(next)
    }

    void run()
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
