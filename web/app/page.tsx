import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <section style={{ textAlign: 'center' }}>
        <h1
          style={{
            margin: 0,
            color: 'var(--ink)',
            fontSize: '34px',
            fontWeight: 600,
            letterSpacing: 0,
          }}
        >
          Sona
        </h1>
        <p
          style={{
            margin: '8px 0 0',
            color: 'var(--ghost)',
            fontSize: '14px',
          }}
        >
          Next.js foundation, Phase 0
        </p>
        <form action="/auth/signout" method="post" style={{ marginTop: '20px' }}>
          <button
            type="submit"
            style={{
              appearance: 'none',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              background: 'var(--paper-warm)',
              color: 'var(--ink)',
              cursor: 'pointer',
              font: 'inherit',
              fontSize: '14px',
              padding: '10px 14px',
            }}
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  )
}
