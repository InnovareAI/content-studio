'use client'

import dynamic from 'next/dynamic'

const AgentClient = dynamic(() => import('@/components/pages/AgentClient'), { ssr: false })

export default function VeraPage() {
  return <AgentClient />
}
