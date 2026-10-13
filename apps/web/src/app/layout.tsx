import { COMPANY, MAKER, MAKER_URL, SITE_URL } from '@tafelrush/shared'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Unbounded } from 'next/font/google'

import { APP_STORE_ID, DESCRIPTION, ldJson, NAME, siteJsonLd } from '@/lib/seo'

import './globals.css'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['800', '900'], variable: '--font-unbounded' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-dm-sans' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: NAME, template: `%s · ${NAME}` },
  description: DESCRIPTION,
  openGraph: { siteName: NAME, locale: 'nl_NL', alternateLocale: ['nl_BE'], type: 'website' },
  twitter: { card: 'summary_large_image' },
  applicationName: NAME,
  authors: [{ name: MAKER, url: MAKER_URL }],
  publisher: COMPANY,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  ...(APP_STORE_ID ? { itunes: { appId: APP_STORE_ID } } : {}),
}

export const viewport: Viewport = { themeColor: '#101018' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${unbounded.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(siteJsonLd()) }} />
        {children}
      </body>
    </html>
  )
}
