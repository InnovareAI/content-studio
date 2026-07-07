import { getSpace } from '@/lib/space'
import { ToastProvider } from '@/design'
import { AppShell } from '@/components/AppShell'
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
  const { user, space } = await getSpace(slug)
  const supabase = await createClient()

  const [projectsResult, pendingResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, slug, is_starred, is_archived')
      .eq('is_archived', false)
      .order('is_starred', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', space.id)
      .in('status', ['Pending Review', 'pending', 'Draft', 'draft']),
  ])

  const projects = projectsResult.error ? [] : (projectsResult.data ?? [])
  const pendingCount = pendingResult.error ? 0 : (pendingResult.count ?? 0)

  return (
    <ToastProvider>
      <AppShell
        space={space}
        projects={projects}
        userEmail={user.email ?? ''}
        pendingCount={pendingCount}
      >
        {children}
      </AppShell>
    </ToastProvider>
  )
}
