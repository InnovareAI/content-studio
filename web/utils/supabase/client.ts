import { createBrowserClient } from '@supabase/ssr'
import { supabaseCookieOptions } from './cookies'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      auth: {
        // PKCE, but the /auth/callback page runs exchangeCodeForSession itself.
        // Disable auto-detection so the client does not race that manual call
        // and double-consume the one-time code.
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
    },
  )
}
