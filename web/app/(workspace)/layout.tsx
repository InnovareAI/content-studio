import { requireUser } from '@/lib/auth'
import { createClient } from '@/utils/supabase/server'
import { OrgProvider } from '@/components/providers/OrgProvider'
import { ProjectProvider } from '@/components/providers/ProjectProvider'
import { RightRailProvider } from '@/lib/rightRailContext'

// Layout for global (non-space) authed surfaces: the spaces shelf, onboarding,
// approvals, invites. There is no per-space rail here; this only seeds the
// Org/Project/RightRail contexts the ported pages expect, using the caller's
// accessible spaces (RLS-scoped) and a default active space. Auth + Toast come
// from the root layout.
export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser()
  const supabase = await createClient()

  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, org_id, name, slug, description, instructions, ai_policy, is_starred, is_archived, is_default, created_at, updated_at')
    .eq('is_archived', false)
    .order('is_starred', { ascending: false })
    .order('updated_at', { ascending: false })

  const projects = projectRows ?? []
  const activeProject = projects.find((p) => p.is_default) ?? projects[0] ?? null

  let org = activeProject
    ? { id: activeProject.org_id as string, name: 'Workspace' }
    : { id: '', name: 'Workspace' }
  if (activeProject) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', activeProject.org_id)
      .maybeSingle()
    if (orgRow) org = orgRow
  }

  return (
    <OrgProvider org={org}>
      <ProjectProvider activeProject={activeProject} projects={projects}>
        <RightRailProvider>{children}</RightRailProvider>
      </ProjectProvider>
    </OrgProvider>
  )
}
