import { notFound } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'

export type Space = { id: string; name: string; slug: string }

export async function getSpace(
  slug: string,
): Promise<{ user: User; space: Space }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: space } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!space) {
    notFound()
  }

  return { user, space }
}
