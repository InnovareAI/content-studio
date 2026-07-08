'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useProject } from '@/components/providers/ProjectProvider'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/db-types'
import { useRightRailContent, useRightRailWidth } from '@/lib/rightRailContext'

export type AppShellSpace = Pick<Project, 'id' | 'name' | 'slug'>
export type AppShellProject = Project

type AppShellProps = Readonly<{
  children: ReactNode
  pendingCount: number
}>

type RailSession = {
  session_id: string
  title: string | null
  last_at: string
  message_count: number
}

const RECENT_TITLE_MAX = 42

function compactRecentTitle(raw: string | null) {
  const title = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return 'Untitled chat'
  if (title.length <= RECENT_TITLE_MAX) return title
  return `${title.slice(0, RECENT_TITLE_MAX - 3).trimEnd()}...`
}

function localRailSessions(projectId: string): RailSession[] {
  if (typeof window === 'undefined') return []

  const prefix = `vera-chat-session:${projectId}:`
  const sessions: RailSession[] = []

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith(prefix)) continue

      const parsed = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<RailSession>
      if (!parsed.session_id) continue

      sessions.push({
        session_id: parsed.session_id,
        title: parsed.title ?? null,
        last_at: parsed.last_at ?? new Date(0).toISOString(),
        message_count: parsed.message_count ?? 0,
      })
    }
  } catch {
    return []
  }

  return sessions.sort((a, b) => b.last_at.localeCompare(a.last_at)).slice(0, 5)
}

function mergeRailSessions(remote: RailSession[], local: RailSession[]) {
  const byId = new Map<string, RailSession>()

  for (const session of [...local, ...remote]) {
    const existing = byId.get(session.session_id)
    if (!existing || session.last_at > existing.last_at || (!existing.title && session.title)) {
      byId.set(session.session_id, session)
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.last_at.localeCompare(a.last_at))
    .slice(0, 5)
}

function spacePath(space: AppShellSpace, section: string) {
  return `/p/${space.slug}/${section}`
}

function glyph(value: string) {
  return (value.trim()[0] ?? 'S').toUpperCase()
}

function isActiveHref(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function RailItem({
  href,
  icon: Icon,
  label,
  badge,
  onClick,
  soon,
  tag,
  collapsed,
}: {
  href: string
  icon: ElementType
  label: string
  badge?: number
  onClick?: () => void
  soon?: boolean
  tag?: string
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const isActive = isActiveHref(pathname, href)

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'} py-1.5 mx-2 transition-colors`}
      style={{
        background: isActive ? 'var(--surface)' : 'transparent',
        color: isActive ? 'var(--ink)' : 'var(--ink-quiet)',
        fontWeight: isActive ? 600 : 450,
        fontSize: 13,
        borderRadius: 'var(--radius-md)',
        border: isActive ? '0.5px solid var(--line)' : '0.5px solid transparent',
        boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : 'none',
        textDecoration: 'none',
      }}
    >
      <Icon
        size={16}
        strokeWidth={isActive ? 2.1 : 1.75}
        style={{ color: isActive ? 'var(--accent)' : 'var(--ghost)', flexShrink: 0 }}
      />
      {collapsed ? (
        typeof badge === 'number' && badge > 0 ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 5,
              right: 8,
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--accent)',
            }}
          />
        ) : null
      ) : (
        <>
          <span className="flex-1 truncate">{label}</span>
          {soon ? (
            <span
              className="text-[10px] px-1.5 leading-tight py-px uppercase"
              style={{
                background: 'rgba(0,0,0,0.06)',
                color: 'var(--ghost)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              Soon
            </span>
          ) : typeof badge === 'number' && badge > 0 ? (
            <span
              className="text-[11px] px-1.5 leading-tight py-px"
              style={{
                background: 'var(--accent-tint)',
                color: 'var(--accent)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          ) : tag ? (
            <span
              className="text-[10px]"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--ghost)',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tag}
            </span>
          ) : null}
        </>
      )}
    </Link>
  )
}

function RailLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        padding: '10px 14px 3px',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ghost)',
      }}
    >
      {children}
    </div>
  )
}

function RailRecents({
  collapsed,
  space,
}: {
  collapsed?: boolean
  space: AppShellSpace
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sessions, setSessions] = useState<RailSession[]>([])

  useEffect(() => {
    if (!space.id) {
      queueMicrotask(() => setSessions([]))
      return
    }

    let cancelled = false
    const load = () => {
      const local = localRailSessions(space.id)
      setSessions(local)

      supabase
        .rpc('list_chat_sessions', { p_project_id: space.id })
        .then(
          ({ data, error }) => {
            if (cancelled) return
            const remote = error ? [] : ((data ?? []) as RailSession[])
            setSessions(mergeRailSessions(remote, localRailSessions(space.id)))
          },
          () => {
            if (!cancelled) setSessions(localRailSessions(space.id))
          },
        )
    }

    load()
    window.addEventListener('vera:home', load)
    window.addEventListener('vera:session', load)

    return () => {
      cancelled = true
      window.removeEventListener('vera:home', load)
      window.removeEventListener('vera:session', load)
    }
  }, [space.id])

  if (collapsed) return null

  const open = (sessionId: string) => {
    const target = spacePath(space, 'vera')

    try {
      localStorage.setItem(`vera-session:${space.id}`, sessionId)
    } catch {
      /* ignore storage errors */
    }

    if (pathname !== target) router.push(target)
    window.dispatchEvent(new CustomEvent('vera:session', { detail: { sid: sessionId } }))
  }

  return (
    <nav className="space-y-0.5 mt-1">
      {sessions.length > 0 ? <RailLabel>Recents</RailLabel> : null}
      {sessions.map((session) => {
        const title = compactRecentTitle(session.title)

        return (
          <button
            key={session.session_id}
            type="button"
            onClick={() => open(session.session_id)}
            title={title}
            aria-label={`Open recent chat: ${title}`}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 mx-2 transition-colors hover:bg-[var(--fog)]"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              width: 'calc(100% - 1rem)',
            }}
          >
            <Clock size={14} style={{ color: 'var(--ghost)', flexShrink: 0 }} />
            <span className="flex-1 truncate text-left" style={{ fontSize: 13, color: 'var(--ink-quiet)' }}>
              {title}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function ClientSwitcher({
  collapsed,
  projects,
  space,
}: {
  collapsed?: boolean
  projects: AppShellProject[]
  space: AppShellProject
}) {
  const router = useRouter()
  const { switchProject } = useProject()
  const [open, setOpen] = useState(false)
  const name = space.name || 'Select space'

  const switcherProjects = useMemo(() => {
    const byId = new Map<string, AppShellProject>()
    byId.set(space.id, space)

    for (const project of projects) {
      if (!project.is_archived) byId.set(project.id, project)
    }

    return Array.from(byId.values())
  }, [projects, space])

  const selectProject = (target: AppShellProject) => {
    setOpen(false)
    switchProject(target.slug)
  }

  return (
    <div style={{ position: 'relative', padding: collapsed ? '12px 0 4px' : '12px 8px 4px' }}>
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          title={name}
          aria-label={`Space: ${name}. Switch space`}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            padding: '5px 0',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {glyph(name)}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '7px 9px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {glyph(name)}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
          <ChevronsUpDown size={14} style={{ color: 'var(--ghost)', flexShrink: 0 }} />
        </button>
      )}

      {open ? (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              ...(collapsed ? { left: 8, width: 236 } : { left: 8, right: 8 }),
              top: '100%',
              marginTop: 4,
              zIndex: 40,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-pop)',
              padding: 4,
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            {switcherProjects.map((project) => {
              const active = project.id === space.id

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => selectProject(project)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 9px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: active ? 'var(--accent-tint)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: active ? 'var(--accent)' : 'var(--fog)',
                      color: active ? '#fff' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {glyph(project.name)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.name}
                  </span>
                  {active ? <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} /> : null}
                </button>
              )
            })}

            <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                router.push('/spaces/new')
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12.5,
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              <Plus size={13} /> New space
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                router.push('/spaces')
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 9px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12.5,
                color: 'var(--ghost)',
              }}
            >
              <LayoutGrid size={13} /> View all spaces
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function AppShell({
  children,
  pendingCount,
}: AppShellProps) {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { activeProject, projects } = useProject()
  const rightRailContent = useRightRailContent()
  const rightRailWidth = useRightRailWidth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [vw, setVw] = useState(1280)
  const hadRailContent = useRef(false)

  useEffect(() => {
    try {
      setNavCollapsed(localStorage.getItem('vera-nav-collapsed') === '1')
      setRailOpen(localStorage.getItem('vera-rail-open') !== '0')
    } catch {
      /* ignore storage errors */
    }
  }, [])

  const saveRailOpen = useCallback((open: boolean) => {
    setRailOpen(open)
    try {
      localStorage.setItem('vera-rail-open', open ? '1' : '0')
    } catch {
      /* ignore storage errors */
    }
  }, [])

  useEffect(() => {
    const openRail = () => saveRailOpen(true)
    window.addEventListener('vera:rail-open', openRail)
    return () => window.removeEventListener('vera:rail-open', openRail)
  }, [saveRailOpen])

  useEffect(() => {
    const hasContent = rightRailContent != null
    if (hasContent && !hadRailContent.current) queueMicrotask(() => setRailOpen(true))
    hadRailContent.current = hasContent
  }, [rightRailContent])

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const narrowRail = vw < 980

  useEffect(() => {
    if (narrowRail) {
      queueMicrotask(() => setRailOpen(false))
      return
    }

    let shouldOpen = true
    try {
      shouldOpen = localStorage.getItem('vera-rail-open') !== '0'
    } catch {
      /* ignore storage errors */
    }
    queueMicrotask(() => setRailOpen(shouldOpen))
  }, [narrowRail])

  const toggleNav = () => {
    setNavCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('vera-nav-collapsed', next ? '1' : '0')
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }

  if (!activeProject) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--paper)' }}>
        <main className="flex-1 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    )
  }

  const space = activeProject

  const startNewSession = () => {
    router.push(`${spacePath(space, 'vera')}?new=${Date.now()}`)
  }

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    await signOut()
  }

  const userEmail = user?.email ?? ''
  const name = userEmail ? userEmail.split('@')[0] : 'Account'
  const displayName = name.charAt(0).toUpperCase() + name.slice(1)
  const initials = (userEmail.slice(0, 2) || 'V').toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <aside
        className="flex-shrink-0 flex flex-col"
        style={{
          width: navCollapsed ? 64 : 204,
          background: 'var(--paper-warm)',
          borderRight: '1px solid var(--paper-edge)',
          transition: 'width 160ms ease',
        }}
      >
        <ClientSwitcher collapsed={navCollapsed} projects={projects} space={space} />

        <button
          type="button"
          onClick={startNewSession}
          title={navCollapsed ? 'New session' : 'Start a new chat session'}
          aria-label="Start a new chat session"
          className={`flex items-center ${navCollapsed ? 'justify-center px-0' : 'gap-2 px-2.5'} py-1.5 mx-2 mt-2 transition-colors`}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            borderRadius: 'var(--radius-md)',
            width: 'calc(100% - 1rem)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} strokeWidth={2.1} style={{ flexShrink: 0 }} />
          {!navCollapsed ? <span className="flex-1 truncate text-left">New session</span> : null}
        </button>

        <nav className="pt-1 space-y-0.5">
          {navCollapsed ? <div style={{ height: 6 }} /> : <RailLabel>Loop</RailLabel>}
          <RailItem
            href={`/p/${space.slug}`}
            icon={LayoutGrid}
            label="Home"
            collapsed={navCollapsed}
          />
          <RailItem
            href={spacePath(space, 'vera')}
            icon={MessageSquare}
            label="VERA"
            collapsed={navCollapsed}
            onClick={() => window.dispatchEvent(new CustomEvent('vera:home'))}
          />
          <RailItem
            href={spacePath(space, 'review')}
            icon={CheckSquare}
            label="Review"
            badge={pendingCount}
            collapsed={navCollapsed}
          />
          <RailItem
            href={spacePath(space, 'knowledge')}
            icon={BookOpen}
            label="Knowledge"
            collapsed={navCollapsed}
          />
          <RailItem
            href={spacePath(space, 'brain')}
            icon={Brain}
            label="Brain"
            collapsed={navCollapsed}
          />
          <RailItem href={spacePath(space, 'measure')} icon={BarChart3} label="Measure" collapsed={navCollapsed} />
        </nav>

        <RailRecents collapsed={navCollapsed} space={space} />

        <div className="flex-1" />

        <nav className="space-y-0.5 pb-1">
          <button
            type="button"
            onClick={toggleNav}
            title={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center ${navCollapsed ? 'justify-center px-0' : 'gap-2 px-2.5'} py-1.5 mx-2 transition-colors hover:bg-[var(--fog)]`}
            style={{
              background: 'transparent',
              color: 'var(--ghost)',
              fontWeight: 450,
              fontSize: 12.5,
              borderRadius: 'var(--radius-md)',
              width: 'calc(100% - 1rem)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {navCollapsed ? (
              <ChevronRight size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            ) : (
              <>
                <ChevronLeft size={16} strokeWidth={1.75} style={{ color: 'var(--ghost)', flexShrink: 0 }} />
                <span className="flex-1 text-left truncate">Collapse</span>
              </>
            )}
          </button>
        </nav>

        <div className="px-2 pb-3 pt-1" style={{ position: 'relative' }}>
          {userMenuOpen ? (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setUserMenuOpen(false)} />
              <div
                style={{
                  position: 'absolute',
                  ...(navCollapsed ? { left: 8, width: 210 } : { left: 8, right: 8 }),
                  bottom: '100%',
                  marginBottom: 6,
                  zIndex: 40,
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-pop)',
                  padding: 4,
                }}
              >
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    color: 'var(--ghost)',
                    borderBottom: '1px solid var(--line)',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {userEmail || 'Not signed in'}
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setUserMenuOpen((value) => !value)}
            title={navCollapsed ? displayName : undefined}
            aria-label={`Account: ${displayName}`}
            className={`w-full flex items-center ${navCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'} py-2 transition-colors hover:bg-[var(--fog)]`}
            style={{
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              className="w-7 h-7 flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
              style={{ background: 'var(--accent-tint)', color: 'var(--accent)', borderRadius: '50%' }}
            >
              {initials}
            </span>
            {!navCollapsed ? (
              <>
                <span className="flex-1 truncate text-[13.5px] text-left" style={{ color: 'var(--ink)' }}>
                  {displayName}
                </span>
                <ChevronsUpDown size={14} style={{ color: 'var(--ghost)', flexShrink: 0 }} />
              </>
            ) : null}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className="flex-1 overflow-y-auto min-h-0" style={{ background: 'var(--paper)' }}>
          {children}
        </main>
      </div>

      {rightRailContent && railOpen ? (
        <>
          {narrowRail ? (
            <div
              onClick={() => saveRailOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(20,20,20,0.18)' }}
            />
          ) : null}
          <aside
            className="flex-shrink-0"
            style={narrowRail
              ? {
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 41,
                  width: 'clamp(320px, 90vw, 460px)',
                  background: 'var(--paper)',
                  borderLeft: '1px solid var(--paper-edge)',
                  boxShadow: 'var(--shadow-modal)',
                }
              : {
                  background: 'transparent',
                  width: rightRailWidth,
                  borderLeft: '1px solid var(--paper-edge)',
                  position: 'relative',
                }}
          >
            <button
              type="button"
              onClick={() => saveRailOpen(false)}
              title="Hide panel"
              style={{
                position: 'absolute',
                left: -13,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 25,
                width: 26,
                height: 42,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--line)',
                borderRadius: 999,
                background: 'var(--surface)',
                color: 'var(--ghost)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-pop)',
              }}
            >
              <ChevronRight size={15} />
            </button>
            <div className="overflow-y-auto" style={{ height: '100%' }}>
              {rightRailContent}
            </div>
          </aside>
        </>
      ) : null}

      {rightRailContent && !railOpen ? (
        <button
          type="button"
          onClick={() => saveRailOpen(true)}
          title="Show panel"
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 25,
            width: 24,
            height: 46,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--line)',
            borderRight: 'none',
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            background: 'var(--surface)',
            color: 'var(--ink-quiet)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          <ChevronLeft size={16} />
        </button>
      ) : null}

    </div>
  )
}
