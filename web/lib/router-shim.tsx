'use client'

// react-router-dom compatibility shim, backed by next/navigation.
//
// The Vite pages were written against react-router. Rather than hand-rewrite
// every useNavigate/useLocation/Link call during the port, we swap the import
// `react-router-dom` -> `@/lib/router-shim` and keep the call sites intact. This
// re-implements the small slice of the react-router API the app actually uses.

import NextLink from 'next/link'
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation'
import { useEffect, useMemo, type CSSProperties, type ReactNode, type MouseEvent } from 'react'

export function useNavigate() {
  const router = useRouter()
  return (to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (to < 0) router.back()
      else router.forward()
      return
    }
    if (opts?.replace) router.replace(to)
    else router.push(to)
  }
}

export function useLocation() {
  const pathname = usePathname() ?? '/'
  const sp = useNextSearchParams()
  const query = sp?.toString() ?? ''
  return { pathname, search: query ? `?${query}` : '', hash: '', state: null, key: 'default' }
}

type SetSearchParams = (
  next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
  opts?: { replace?: boolean },
) => void

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const sp = useNextSearchParams()
  const params = useMemo(() => new URLSearchParams(sp?.toString() ?? ''), [sp])
  const setSearchParams: SetSearchParams = (next, opts) => {
    const resolved =
      typeof next === 'function'
        ? next(new URLSearchParams(params))
        : next instanceof URLSearchParams
          ? next
          : new URLSearchParams(next)
    const query = resolved.toString()
    const url = query ? `${pathname}?${query}` : pathname
    if (opts?.replace) router.replace(url)
    else router.push(url)
  }
  return [params, setSearchParams]
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return (useNextParams() ?? {}) as T
}

type NavArg = { isActive: boolean; isPending: boolean }

type LinkProps = {
  to: string
  replace?: boolean
  state?: unknown
  className?: string
  style?: CSSProperties
  children?: ReactNode
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
  title?: string
  target?: string
  rel?: string
  role?: string
  'aria-label'?: string
  'aria-current'?: boolean | 'page'
}

export function Link({ to, replace, state: _state, children, ...rest }: LinkProps) {
  return (
    <NextLink href={to} replace={replace} {...rest}>
      {children}
    </NextLink>
  )
}

type NavLinkProps = Omit<LinkProps, 'className' | 'style' | 'children'> & {
  end?: boolean
  className?: string | ((a: NavArg) => string)
  style?: CSSProperties | ((a: NavArg) => CSSProperties)
  children?: ReactNode | ((a: NavArg) => ReactNode)
}

export function NavLink({ to, end, className, style, children, ...rest }: NavLinkProps) {
  const pathname = usePathname() ?? '/'
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
  const arg: NavArg = { isActive, isPending: false }
  const cls = typeof className === 'function' ? className(arg) : className
  const st = typeof style === 'function' ? style(arg) : style
  const kids = typeof children === 'function' ? (children as (a: NavArg) => ReactNode)(arg) : children
  return (
    <NextLink href={to} className={cls} style={st} aria-current={isActive ? 'page' : undefined} {...rest}>
      {kids}
    </NextLink>
  )
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [to, replace, router])
  return null
}

export function useMatch(pattern: string) {
  const pathname = usePathname() ?? '/'
  const base = pattern.replace(/\/\*$/, '')
  const isMatch = pattern.endsWith('/*') ? pathname === base || pathname.startsWith(`${base}/`) : pathname === pattern
  return isMatch ? { params: {}, pathname, pathnameBase: base, pattern: { path: pattern } } : null
}

export function Outlet() {
  return null
}
