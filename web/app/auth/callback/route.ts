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
function loginError(base: string, reason: string, detail?: string | null) {
  const params = new URLSearchParams({ error: reason })
  if (detail) params.set('detail', detail.slice(0, 160))
  // Surface the failing stage in the server log too (shows in Netlify function
  // logs) so an OAuth failure is diagnosable without guesswork.
  console.error(`[auth/callback] ${reason}${detail ? `: ${detail}` : ''}`)
  return NextResponse.redirect(`${base}/login?${params.toString()}`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  const nextParam = searchParams.get('next') ?? '/'
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin

  if (!code) {
    // Supabase can redirect here with an OAuth error instead of a code (for
    // example a PKCE flow-state that expired). Pass it through so it is visible.
    return loginError(base, oauthError ? 'oauth' : 'nocode', oauthError ? `${oauthError}: ${oauthErrorDescription ?? ''}` : null)
  }

  const response = NextResponse.redirect(`${base}${next}`)

  // Track the auth-token cookie chunks written by each pass. Azure returns large
  // provider tokens, so the first write (with provider tokens) can span several
  // chunks (auth-token.0/.1/.2). Stripping the provider tokens shrinks the
  // session to fewer chunks, and the stale higher chunks must be expired or the
  // browser sends a corrupted, oversized cookie that the middleware size guard
  // then wipes. That orphaned-chunk bug is what broke Microsoft sign-in.
  const preStripChunks = new Set<string>()
  const postStripChunks = new Set<string>()
  let stripPass = false

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
            if (name.includes('auth-token')) {
              ;(stripPass ? postStripChunks : preStripChunks).add(name)
            }
          })
        },
      },
    },
  )

  // Probe: what sb-* cookies actually reached this route handler, and is the PKCE
  // code-verifier among them? Emitted as its own untruncated query params (vc,
  // sbn) so we can tell a lost-cookie problem apart from a genuine exchange
  // rejection without digging through function logs.
  const sbCookieNames = request.cookies
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith('sb-'))
  const hadVerifier = sbCookieNames.some((n) => n.endsWith('code-verifier'))

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error(
      `[auth/callback] exchange failed verifier=${hadVerifier} sb=[${sbCookieNames.join(',')}] msg=${error.message}`,
    )
    const params = new URLSearchParams({
      error: 'exchange',
      vc: String(hadVerifier),
      sbn: String(sbCookieNames.length),
    })
    return NextResponse.redirect(`${base}/login?${params.toString()}`)
  }

  if (hasProviderTokens(data.session)) {
    stripPass = true
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      return loginError(base, 'setsession', sessionError.message)
    }

    // Expire any chunk the provider-token write created that the stripped write
    // did not overwrite, so no stale fragment survives on the response.
    preStripChunks.forEach((name) => {
      if (!postStripChunks.has(name)) {
        response.cookies.set(name, '', { ...supabaseCookieOptions, maxAge: 0 })
      }
    })
  }

  return response
}
