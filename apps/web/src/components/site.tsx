import { APP_STORE_URL, COMPANY, MAKER, MAKER_URL, PLAY_STORE_URL } from '@tafelrush/shared'
import Link from 'next/link'

/** The × mark: lime with a pink glitch shadow. */
export function Mark({ size = 40 }: { size?: number }) {
  const bar = (fill: string, rot: number) => (
    <rect x="42" y="8" width="16" height="84" rx="8" fill={fill} transform={`rotate(${rot} 50 50)`} />
  )
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g transform="translate(5 4)">
        {bar('#FF3D8B', 45)}
        {bar('#FF3D8B', -45)}
      </g>
      {bar('#C6FF3D', 45)}
      {bar('#C6FF3D', -45)}
    </svg>
  )
}

export function StoreButtons() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={PLAY_STORE_URL}
        className="inline-flex min-h-14 items-center gap-3 rounded-2xl bg-lime px-6 font-display text-lg font-black text-ink"
      >
        <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
          <path d="M1 1.5v19a1 1 0 0 0 1.5.86l16-9.5a1 1 0 0 0 0-1.72l-16-9.5A1 1 0 0 0 1 1.5z" fill="currentColor" />
        </svg>
        Google Play
      </a>
      {APP_STORE_URL ? (
        <a
          href={APP_STORE_URL}
          className="inline-flex min-h-14 items-center rounded-2xl border-2 border-line px-6 font-bold"
        >
          App Store
        </a>
      ) : (
        <span className="text-sm text-muted">iPhone volgt.</span>
      )}
    </div>
  )
}

export function Header() {
  return (
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-3 font-display text-lg font-black">
        <Mark size={32} />
        Tafel Rush
      </Link>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="mt-24 flex flex-col items-center gap-2 border-t border-line py-10 text-center text-sm text-muted">
      <Mark size={32} />
      <p>
        Gemaakt door{' '}
        <a href={MAKER_URL} className="text-fg underline">
          {MAKER}
        </a>{' '}
        · {COMPANY}
      </p>
      <p>
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </footer>
  )
}
