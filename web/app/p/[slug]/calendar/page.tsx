'use client'

import dynamic from 'next/dynamic'

const Client = dynamic(() => import('@/components/pages/CalendarClient'), { ssr: false })

export default function Page() {
  return <Client />
}
