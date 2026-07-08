import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Page() {
  await requireUser()
  redirect('/')
}
