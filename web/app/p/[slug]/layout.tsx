import { getSpace } from '@/lib/space'

type SpaceLayoutProps = Readonly<{
  children: React.ReactNode
  params: Promise<{
    slug: string
  }>
}>

export default async function SpaceLayout({
  children,
  params,
}: SpaceLayoutProps) {
  const { slug } = await params
  const { space } = await getSpace(slug)

  void space

  return children
}
