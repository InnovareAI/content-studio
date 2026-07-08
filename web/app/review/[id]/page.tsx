import { redirectToDefaultProject } from '@/lib/projectRedirect'

type PageProps = Readonly<{
  params: Promise<{
    id: string
  }>
}>

export default async function Page({ params }: PageProps) {
  const { id } = await params
  await redirectToDefaultProject(`review/${id}`)
}
