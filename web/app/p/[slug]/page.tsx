import { getSpace } from '@/lib/space'

type SpacePageProps = Readonly<{
  params: Promise<{
    slug: string
  }>
}>

export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params
  const { space } = await getSpace(slug)

  return (
    <section
      style={{
        padding: '24px',
        color: 'var(--ink)',
        minHeight: '100%',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
        {space.name}
      </h1>
      <p style={{ margin: '8px 0 0', color: 'var(--ghost)' }}>
        /p/{space.slug}
      </p>
    </section>
  )
}
