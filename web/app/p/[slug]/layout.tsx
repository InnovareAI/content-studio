import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type SpaceLayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{
    slug: string
  }>
}>

export default async function SpaceLayout({
  children,
  params,
}: SpaceLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!project) {
    notFound()
  }

  return children
}
