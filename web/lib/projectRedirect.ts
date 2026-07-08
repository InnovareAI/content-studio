import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'

async function defaultProjectSlug() {
  await requireUser()
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('slug')
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('is_starred', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)

  return data?.[0]?.slug ?? null
}

export async function redirectToDefaultProject(section: string) {
  const slug = await defaultProjectSlug()
  if (!slug) redirect('/spaces')

  redirect(`/p/${slug}/${section}`)
}
