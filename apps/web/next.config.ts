import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@tafelrush/shared'],
  turbopack: { root: path.join(import.meta.dirname, '../..') },
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  poweredByHeader: false,

  // The browser game lives in public/spelen (scripts/spelen.mjs). It is a single-page
  // app: real files are served as they are, every other /spelen/... path (/spelen/d/<code>,
  // /spelen/instellingen) gets its index.html and the app's router takes it from there.
  async rewrites() {
    return [
      { source: '/spelen', destination: '/spelen/index.html' },
      { source: '/spelen/:path*', destination: '/spelen/index.html' },
    ]
  },

  async headers() {
    // Bundles and assets have a content hash in their name: cache them for good.
    const immutable = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
    return [
      { source: '/spelen/_expo/static/:path*', headers: immutable },
      { source: '/spelen/assets/:path*', headers: immutable },
    ]
  },
}

export default config
