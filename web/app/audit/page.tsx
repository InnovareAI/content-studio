import { redirectToDefaultProject } from '@/lib/projectRedirect'

export default async function Page() {
  await redirectToDefaultProject('performance?tab=audit')
}
