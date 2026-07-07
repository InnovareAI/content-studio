'use client'
import dynamic from 'next/dynamic'
const Client = dynamic(() => import('@/components/pages/ReviewDetailClient'), { ssr: false })
export default function Page() { return <Client /> }
