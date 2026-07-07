'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.refresh()
    router.push('/')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        color: 'var(--ink)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 'min(100%, 360px)',
          display: 'grid',
          gap: '14px',
          padding: '24px',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          background: 'var(--paper-warm)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <div style={{ display: 'grid', gap: '4px' }}>
          <h1
            style={{
              margin: 0,
              color: 'var(--ink)',
              fontSize: '24px',
              fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            Sona
          </h1>
          <p
            style={{
              margin: 0,
              color: 'var(--ghost)',
              fontSize: '13px',
            }}
          >
            Sign in to continue.
          </p>
        </div>

        <label
          style={{
            display: 'grid',
            gap: '6px',
            color: 'var(--ink-quiet)',
            fontSize: '13px',
          }}
        >
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{
              width: '100%',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '10px 12px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              font: 'inherit',
              outlineColor: 'var(--accent)',
            }}
          />
        </label>

        <label
          style={{
            display: 'grid',
            gap: '6px',
            color: 'var(--ink-quiet)',
            fontSize: '13px',
          }}
        >
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{
              width: '100%',
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '10px 12px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              font: 'inherit',
              outlineColor: 'var(--accent)',
            }}
          />
        </label>

        {errorMessage ? (
          <p
            role="alert"
            style={{
              margin: 0,
              color: 'var(--danger)',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            border: 0,
            borderRadius: '10px',
            padding: '10px 12px',
            background: 'var(--accent)',
            color: 'white',
            cursor: isLoading ? 'default' : 'pointer',
            font: 'inherit',
            fontWeight: 600,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
