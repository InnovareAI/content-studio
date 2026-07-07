'use client'

import { createClient } from '@/utils/supabase/client'

export const supabase = createClient()

export * from './db-types'
