import { SITE_URL } from '@tafelrush/shared'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Unbounded } from 'next/font/google'

import './globals.css'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['800', '900'], variable: '--font-unbounded' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Tafel Rush', template: '%s · Tafel Rush' },
  description: 'Tafels oefenen door ze hardop te zeggen. De app zegt de som, jij zegt het antwoord.',
  openGraph: { siteName: 'Tafel Rush', locale: 'nl_NL', type: 'website' },
}

export const viewport: Viewport = { themeColor: '#101018' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${unbounded.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
