import path from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is what lets the app self-host on Hetzner behind
  // `next start`, matching SAM's deploy model.
  output: 'standalone',
  outputFileTracingRoot: webRoot,
  eslint: {
    // No eslint config yet in the scaffold; do not fail the build on it.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
