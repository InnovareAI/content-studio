/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output is what lets the app self-host on Hetzner behind
  // `next start`, matching SAM's deploy model.
  output: 'standalone',
  eslint: {
    // No eslint config yet in the scaffold; do not fail the build on it.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
