import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@tafelrush/shared'],
  turbopack: { root: path.join(import.meta.dirname, '../..') },
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  poweredByHeader: false,
}

export default config
