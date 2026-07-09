import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, is_default, is_archived')
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const spaces = data ?? []
  const space = spaces.find(row => row.is_default === true) ?? spaces[0]

  if (space) {
    redirect(`/p/${space.slug}/agent`)
  }

  redirect('/onboarding')
}
