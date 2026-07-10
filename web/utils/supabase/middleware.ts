import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseCookieOptions } from './cookies'

const COOKIE_HEADER_LIMIT = 7680

type SupabaseCookie = {
  name: string
  value: string
  options: CookieOptions
}

function shouldSkipCookieSizeGuard(pathname: string) {
  return (
    pathname === '/auth/callback' ||
    pathname === '/auth/confirm' ||
    pathname.startsWith('/api/auth/')
  )
}

function isSupabaseAuthCookie(name: string) {
  return (
    name.startsWith('sb-') &&
    (name.includes('auth-token') || name.includes('code-verifier'))
  )
}

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie)
  })
}

function applyCookieSizeGuard(response: NextResponse, request: NextRequest) {
  const cookieHeaderLength = request.headers.get('cookie')?.length ?? 0

  if (
    cookieHeaderLength <= COOKIE_HEADER_LIMIT ||
    shouldSkipCookieSizeGuard(request.nextUrl.pathname)
  ) {
    return response
  }

  // Large Supabase sessions can trigger proxy 431 responses. Clear stale auth cookies.
  request.cookies.getAll().forEach(({ name }) => {
    if (isSupabaseAuthCookie(name)) {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
      })
    }
  })

  return response
}

function redirectLoginCodeToCallback(request: NextRequest) {
  if (
    request.nextUrl.pathname !== '/login' ||
    !request.nextUrl.searchParams.has('code')
  ) {
    return null
  }

  const callbackUrl = request.nextUrl.clone()
  callbackUrl.pathname = '/auth/callback'
  return NextResponse.redirect(callbackUrl)
}

export async function updateSession(request: NextRequest) {
  // The /auth/* routes (OAuth callback, email confirm) run their own Supabase
  // code exchange and must read the PKCE code-verifier cookie exactly as the
  // browser wrote it. Running the session-refresh client here first (getUser +
  // cookie rewrite) can drop that cookie from the request the route handler
  // sees, which surfaces as "code verifier not found" and breaks OAuth sign-in.
  // These routes do not need session refresh, so leave them untouched.
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.next({ request })
  }

  const callbackRedirect = redirectLoginCodeToCallback(request)
  if (callbackRedirect) {
    return callbackRedirect
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Home route: land the user in a working space (or login / onboarding). Done
  // here in middleware rather than app/page.tsx because a redirect-only server
  // page trips a Next RSC clientReferenceManifest invariant (500).
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.search = ''
    if (!user) {
      url.pathname = '/login'
    } else {
      const { data: rows } = await supabase
        .from('projects')
        .select('slug, is_default, is_archived')
        .eq('is_archived', false)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
      const list = rows ?? []
      const target = list.find((row) => row.is_default) ?? list[0]
      url.pathname = target ? `/p/${target.slug}/agent` : '/onboarding'
    }
    const redirectResponse = NextResponse.redirect(url)
    copyResponseCookies(supabaseResponse, redirectResponse)
    return applyCookieSizeGuard(redirectResponse, request)
  }

  if (!user && request.nextUrl.pathname.startsWith('/p/')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    const redirectResponse = NextResponse.redirect(loginUrl)
    copyResponseCookies(supabaseResponse, redirectResponse)
    return applyCookieSizeGuard(redirectResponse, request)
  }

  return applyCookieSizeGuard(supabaseResponse, request)
}
