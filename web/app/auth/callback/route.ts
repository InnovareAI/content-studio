import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from '@/utils/supabase/cookies'

type SupabaseCookie = {
  name: string
  value: string
  options: CookieOptions
}

type CallbackSession = {
  access_token: string
  refresh_token: string
  provider_token?: string | null
  provider_refresh_token?: string | null
}

function hasProviderTokens(session: CallbackSession | null) {
  return Boolean(session?.provider_token || session?.provider_refresh_token)
}

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
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${base}/login?error=auth_callback`)
  }

  if (hasProviderTokens(data.session)) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      return NextResponse.redirect(`${base}/login?error=auth_callback`)
    }
  }

  return response
}
