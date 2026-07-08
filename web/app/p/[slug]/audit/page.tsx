import { redirect } from 'next/navigation'

type PageProps = Readonly<{
  params: Promise<{
    slug: string
  }>
}>

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  redirect(`/p/${slug}/measure?tab=audit`)
}
