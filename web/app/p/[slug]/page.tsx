type SpacePageProps = Readonly<{
  params: Promise<{
    slug: string
  }>
}>

export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params

  return (
    <main style={{ padding: '24px', color: 'var(--ink)' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>
        Space: {slug}
      </h1>
      <p style={{ margin: '8px 0 0', color: 'var(--ghost)' }}>
        Tenant access is checked by the server layout before this page renders.
      </p>
    </main>
  )
}
