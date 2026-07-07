'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export interface OrgInfo {
  id: string
  name: string
}

type OrgMember = {
  org_id: string
  role: string
  organizations: OrgInfo
}

type OrgContextType = {
  activeOrg: OrgInfo | null
  activeRole: string | null
  orgs: OrgMember[]
  loading: boolean
  isOrgMember: boolean
  switchOrg: (orgId: string) => void
  refetch: () => void
}

const OrgContext = createContext<OrgContextType>({
  activeOrg: null,
  activeRole: null,
  orgs: [],
  loading: true,
  isOrgMember: false,
  switchOrg: () => {},
  refetch: () => {},
})

type OrgProviderProps = Readonly<{
  children: ReactNode
  org: OrgInfo
}>

export function OrgProvider({ children, org }: OrgProviderProps) {
  const router = useRouter()

  const refetch = useCallback(() => {
    router.refresh()
  }, [router])

  const value = useMemo<OrgContextType>(() => ({
    activeOrg: org,
    activeRole: null,
    orgs: [{
      org_id: org.id,
      role: 'member',
      organizations: org,
    }],
    loading: false,
    isOrgMember: true,
    switchOrg: () => {},
    refetch,
  }), [org, refetch])

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
