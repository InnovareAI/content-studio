import { createBrowserClient } from '@supabase/ssr'
import { supabaseCookieOptions } from './cookies'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Do not pass auth options here: createBrowserClient spreads them first
      // and then hard-sets flowType 'pkce' and detectSessionInUrl in the
      // browser, so overrides are silently discarded. The auth callback page
      // relies on that forced auto-detection and must not exchange manually.
      cookieOptions: supabaseCookieOptions,
    },
  )
}
