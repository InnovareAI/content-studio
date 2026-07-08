import Link from 'next/link'
import { getSpace } from '@/lib/space'

type SpacePageProps = Readonly<{
  params: Promise<{
    slug: string
  }>
}>

export default async function SpacePage({ params }: SpacePageProps) {
  const { slug } = await params
  const { space } = await getSpace(slug)
  const base = `/p/${space.slug}`

  const items = [
    { label: 'VERA', href: `${base}/vera`, body: 'Open the working thread and continue the next session.' },
    { label: 'Review', href: `${base}/review`, body: 'Approve, tweak, schedule, or reject content.' },
    { label: 'Knowledge', href: `${base}/knowledge`, body: 'Review sources, uploads, and extracted context.' },
    { label: 'Brain', href: `${base}/brain`, body: 'Tune strategy, voice, audiences, and channel rules.' },
    { label: 'Measure', href: `${base}/measure`, body: 'Track audits, outcomes, and performance signals.' },
  ]

  return (
    <section
      style={{
        padding: '32px',
        color: 'var(--ink)',
        minHeight: '100%',
        maxWidth: '1120px',
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          color: 'var(--ghost)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {space.name}
      </p>
      <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 600, letterSpacing: 0 }}>
        Home
      </h1>
      <p style={{ margin: '8px 0 0', color: 'var(--ghost)', fontSize: '14px', maxWidth: '60ch' }}>
        The space desk starts here. Use the loop below to move from open work to review, knowledge, strategy, and measurement.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '12px',
          marginTop: '28px',
        }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              minHeight: '118px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.label}</span>
            <span style={{ color: 'var(--ghost)', fontSize: '12.5px', lineHeight: 1.5 }}>
              {item.body}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
