'use client'

import { useMemo } from 'react'
import { ArrowRight, FolderOpen, Plus } from 'lucide-react'
import { useNavigate } from '@/lib/router-shim'
import type { Project } from '@/lib/db-types'
import { useProject } from '@/components/providers/ProjectProvider'
import { Button, EmptyState, PageHeader, color, radius, space, type as t } from '@/design'

export default function SpacesClient() {
  const navigate = useNavigate()
  const { projects, loading } = useProject()

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const defaultRank = Number(b.is_default) - Number(a.is_default)
      if (defaultRank !== 0) return defaultRank
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [projects])

  function enterSpace(project: Project) {
    try {
      localStorage.setItem(`vera-active-project:${project.org_id}`, project.slug)
    } catch {
      void 0
    }

    navigate(`/p/${project.slug}/agent`)
  }

  const newSpaceAction = (
    <Button
      variant="primary"
      leading={<Plus size={14} />}
      onClick={() => navigate('/onboarding')}
    >
      New space
    </Button>
  )

  return (
    <div style={{ padding: space[8], maxWidth: 1120 }}>
      <PageHeader
        title="Spaces"
        subtitle="Pick a space to work in."
        actions={newSpaceAction}
      />

      {loading ? (
        <div style={{ color: color.ghost, fontSize: t.size.sm }}>Loading spaces...</div>
      ) : orderedProjects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} strokeWidth={1.5} />}
          title="No spaces yet"
          body="Create your first space to start working."
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
            gap: space[4],
          }}
        >
          {orderedProjects.map(project => (
            <SpaceCard
              key={project.id}
              project={project}
              onEnter={() => enterSpace(project)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SpaceCard({
  project,
  onEnter,
}: {
  project: Project
  onEnter: () => void
}) {
  const description = project.description?.trim() || 'No description yet.'

  return (
    <button
      type="button"
      onClick={onEnter}
      style={{
        minHeight: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: space[5],
        padding: space[5],
        border: `1px solid ${color.line}`,
        borderRadius: radius.md,
        background: color.surface,
        color: color.ink,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: t.family.sans,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: space[3], minWidth: 0 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            background: project.is_default ? color.ink : color.paper2,
            color: project.is_default ? color.surface : color.ink2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: t.size.sm,
            fontWeight: t.weight.semibold,
          }}
        >
          {project.name.slice(0, 1).toUpperCase()}
        </span>
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              color: color.ink,
              fontSize: t.size.body,
              fontWeight: t.weight.semibold,
              lineHeight: t.lineHeight.snug,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {project.name}
          </span>
          <span
            style={{
              display: 'block',
              color: color.ghost,
              fontSize: t.size.cap,
              lineHeight: t.lineHeight.relaxed,
              marginTop: space[2],
            }}
          >
            {description}
          </span>
        </span>
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: space[2],
          color: color.accent,
          fontSize: t.size.cap,
          fontWeight: t.weight.medium,
        }}
      >
        Enter space
        <ArrowRight size={13} />
      </span>
    </button>
  )
}
