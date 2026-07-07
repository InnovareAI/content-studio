'use client'
import dynamic from 'next/dynamic'
const Client = dynamic(() => import('@/components/pages/KnowledgeClient'), { ssr: false })
export default function Page() { return <Client /> }
