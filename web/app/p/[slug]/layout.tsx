import { getSpace } from '@/lib/space'
import { ToastProvider } from '@/design'
import { AppShell } from '@/components/AppShell'
import { createClient } from '@/utils/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { OrgProvider } from '@/components/providers/OrgProvider'
import { ProjectProvider } from '@/components/providers/ProjectProvider'
import { RightRailProvider } from '@/lib/rightRailContext'

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
  const { space: project } = await getSpace(slug)
  const supabase = await createClient()

  const [projectsResult, orgResult, pendingResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, org_id, name, slug, description, instructions, ai_policy, is_starred, is_archived, is_default, created_at, updated_at')
      .eq('org_id', project.org_id)
      .eq('is_archived', false)
      .order('is_starred', { ascending: false })
      .order('updated_at', { ascending: false }),
    supabase
      .from('organizations')
      .select('id, name')
      .eq('id', project.org_id)
      .maybeSingle(),
    supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', project.org_id)
      .eq('project_id', project.id)
      .in('status', ['Pending Review', 'pending', 'Draft', 'draft']),
  ])

  const projects = projectsResult.error ? [] : (projectsResult.data ?? [])
  const org = orgResult.error || !orgResult.data
    ? { id: project.org_id, name: 'Workspace' }
    : orgResult.data
  const pendingCount = pendingResult.error ? 0 : (pendingResult.count ?? 0)

  return (
    <AuthProvider>
      <ToastProvider>
        <OrgProvider org={org}>
          <ProjectProvider activeProject={project} projects={projects}>
            <RightRailProvider>
              <AppShell pendingCount={pendingCount}>
                {children}
              </AppShell>
            </RightRailProvider>
          </ProjectProvider>
        </OrgProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
