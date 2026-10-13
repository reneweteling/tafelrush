// A challenge link. With the app installed (and app links verified) the phone opens the app
// directly; otherwise this page shows the challenge and the way to the store.

import { APP_SCHEME, challengeUrl, decodeChallenge, describeTables } from '@tafelrush/shared'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Footer, Header, Mark, StoreButtons } from '@/components/site'
import { APP_STORE_ID, NAME } from '@/lib/seo'

type Props = { params: Promise<{ code: string }> }

function title(code: string): string {
  const c = decodeChallenge(code)
  if (!c) return 'Uitdaging'
  const who = c.name || 'Iemand'
  return c.reply ? `${who} deed ${c.score}/10 in ${c.seconds} sec` : `${who} daagt je uit: ${c.score}/10 in ${c.seconds} sec`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const t = title(decodeURIComponent(code))
  const description = 'Zelfde 10 sommen. Kun jij het beter? Tafel Rush: tafels oefenen door ze hardop te zeggen.'
  const path = `/d/${code}`
  return {
    title: t,
    description,
    alternates: { canonical: path },
    openGraph: { title: t, description, url: path, siteName: NAME, locale: 'nl_NL', type: 'website' },
    twitter: { card: 'summary_large_image', title: t, description },
    // Personal and thin: keep out of search, but crawlable so link previews work.
    robots: { index: false, follow: true },
    // The iOS smart banner opens the challenge in the app.
    ...(APP_STORE_ID ? { itunes: { appId: APP_STORE_ID, appArgument: challengeUrl(code) } } : {}),
  }
}

export default async function ChallengePage({ params }: Props) {
  const { code: raw } = await params
  const code = decodeURIComponent(raw)
  const c = decodeChallenge(code)
  const who = c?.name || 'Iemand'

  return (
    <div className="mx-auto max-w-2xl px-5">
      <Header />
      <main className="flex flex-col items-start gap-6 py-10">
        {c ? (
          <>
            <Mark size={64} />
            <p className="text-sm font-bold tracking-widest text-muted uppercase">
              {c.reply ? 'Antwoord op je uitdaging' : 'Uitdaging'}
            </p>
            <h1 className="font-display text-4xl leading-tight font-black sm:text-5xl">
              {c.reply ? `${who} deed jouw sommen` : `${who} daagt je uit`}
            </h1>
            <div className="w-full rounded-3xl bg-pink p-6 text-ink">
              <p className="font-display text-3xl font-black">
                {c.score}/10 in {c.seconds} sec
              </p>
              <p className="mt-2 font-bold">
                Zelfde 10 sommen, {describeTables(c.sums)}. Kun jij het beter?
              </p>
            </div>
            <a
              href={`${APP_SCHEME}://d/${encodeURIComponent(code)}`}
              className="inline-flex min-h-14 items-center rounded-2xl border-2 border-line px-6 font-bold"
            >
              Heb je de app al? Open de uitdaging
            </a>
            <p className="text-muted">Nog niet? Download Tafel Rush en open deze link daarna nog een keer.</p>
            <StoreButtons />
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-black">Deze link klopt niet</h1>
            <p className="text-muted">Vraag of ze hem nog een keer stuurt.</p>
            <Link href="/" className="underline">
              Naar Tafel Rush
            </Link>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
