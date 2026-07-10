'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/db-types'

type ProjectContextType = {
  activeProject: Project | null
  projects: Project[]
  starredProjects: Project[]
  recentProjects: Project[]
  loading: boolean
  switchProject: (slugOrId: string) => void
  refetch: () => void
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  projects: [],
  starredProjects: [],
  recentProjects: [],
  loading: true,
  switchProject: () => {},
  refetch: () => {},
})

type ProjectProviderProps = Readonly<{
  children: ReactNode
  activeProject: Project | null
  projects: Project[]
}>

export function ProjectProvider({
  children,
  activeProject,
  projects,
}: ProjectProviderProps) {
  const router = useRouter()

  const visibleProjects = useMemo(() => {
    const byId = new Map<string, Project>()
    if (activeProject) byId.set(activeProject.id, activeProject)

    for (const project of projects) {
      if (!project.is_archived) byId.set(project.id, project)
    }

    return Array.from(byId.values())
  }, [activeProject, projects])

  const switchProject = useCallback((slugOrId: string) => {
    const target = visibleProjects.find(project => project.slug === slugOrId || project.id === slugOrId)
    if (!target) return

    try {
      localStorage.setItem(`vera-active-project:${target.org_id}`, target.slug)
    } catch {
      /* ignore storage errors */
    }

    router.push(`/p/${target.slug}/agent`)
  }, [router, visibleProjects])

  const refetch = useCallback(() => {
    router.refresh()
  }, [router])

  const value = useMemo<ProjectContextType>(() => ({
    activeProject,
    projects: visibleProjects,
    starredProjects: visibleProjects.filter(project => project.is_starred),
    recentProjects: visibleProjects.filter(project => !project.is_starred).slice(0, 6),
    loading: false,
    switchProject,
    refetch,
  }), [activeProject, visibleProjects, switchProject, refetch])

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
