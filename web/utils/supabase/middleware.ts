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

export async function updateSession(request: NextRequest) {
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

  if (!user && request.nextUrl.pathname.startsWith('/p/')) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    copyResponseCookies(supabaseResponse, redirectResponse)
    return applyCookieSizeGuard(redirectResponse, request)
  }

  return applyCookieSizeGuard(supabaseResponse, request)
}
