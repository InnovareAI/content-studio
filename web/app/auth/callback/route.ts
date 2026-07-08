import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// OAuth / magic-link / recovery callback. Supabase redirects here with a PKCE
// `code`; we exchange it for a cookie session (which the middleware reads) and
// then send the user on to `next`. Without this the code was never exchanged,
// so OAuth and magic-link left the user unauthenticated on /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  // Only allow internal relative redirects (no open redirect).
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
