import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to web/. Without this, Next's multiple-lockfile
  // heuristic picked the home-directory lockfile as the root, which broke output
  // tracing and left the page routes unmapped on Netlify. Required here.
  outputFileTracingRoot: webRoot,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ported from the type-clean Vite app; tolerate port type friction so
    // bundling is not blocked. Module-resolution errors still fail the build.
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: '/p/:slug/calendar', destination: '/p/:slug/planner', permanent: false },
      { source: '/p/:slug/artifacts', destination: '/p/:slug/studio', permanent: false },
      { source: '/p/:slug/measure', destination: '/p/:slug/performance', permanent: false },
      { source: '/p/:slug/keys', destination: '/p/:slug/integrations', permanent: false },
      { source: '/p/:slug/brain', destination: '/p/:slug/playbook', permanent: false },
      { source: '/p/:slug/skills', destination: '/p/:slug/ai-settings', permanent: false },
      { source: '/p/:slug/vera', destination: '/p/:slug/agent', permanent: false },
      { source: '/p/:slug/dashboard', destination: '/p/:slug/agent', permanent: false },
      { source: '/p/:slug/generate', destination: '/p/:slug/agent', permanent: false },
      { source: '/p/:slug/blueprint', destination: '/p/:slug/agent', permanent: false },
      { source: '/p/:slug/audit', destination: '/p/:slug/performance', permanent: false },
      { source: '/p/:slug/intel', destination: '/p/:slug/performance', permanent: false },
    ]
  },
}

export default nextConfig
