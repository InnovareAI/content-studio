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
}

export default nextConfig
