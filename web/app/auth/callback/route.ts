import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// OAuth / magic-link / recovery callback. Supabase redirects here with a PKCE
// `code`; we exchange it for a cookie session (which the middleware reads) and
// send the user on to `next`.
//
// Two Netlify-specific details matter:
//  1. A route handler sees the INTERNAL deploy host in request.url, not the
//     public domain, so we build redirects from `x-forwarded-host` (the public
//     host, e.g. sona.innovareai.com). Redirecting to the internal host loses
//     the session cookie and bounces the user back to login.
//  2. Cookies from exchangeCodeForSession are bound directly to the redirect
//     response so they actually persist through the redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=auth_callback`)
  }

  const response = NextResponse.redirect(`${base}${next}`)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${base}/login?error=auth_callback`)
  }
  return response
}
