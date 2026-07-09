'use client'

// The `/` route is resolved in middleware (redirects to the default space, or to
// /login / /onboarding). This component is a safe fallback that is not rendered
// in practice. It is a client component and does not redirect, so it cannot trip
// the Next RSC clientReferenceManifest invariant that a redirect-only server page
// hits (which was returning a 500 on `/`).
export default function HomePage() {
  return null
}
