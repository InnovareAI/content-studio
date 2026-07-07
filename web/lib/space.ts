import { notFound } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'
import type { Project } from '@/lib/db-types'

export type Space = Project

export async function getSpace(
  slug: string,
): Promise<{ user: User; space: Space }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: space } = await supabase
    .from('projects')
    .select('id, org_id, name, slug, description, instructions, ai_policy, is_starred, is_archived, is_default, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!space) {
    notFound()
  }

  return { user, space }
}
