import { APP_STORE_URL, COMPANY, MAKER, MAKER_URL, PLAY_STORE_URL } from '@tafelrush/shared'
import Link from 'next/link'

/** The × mark: lime with a pink glitch shadow. */
export function Mark({ size = 40, className }: { size?: number; className?: string }) {
  const bar = (fill: string, rot: number) => (
    <rect x="42" y="8" width="16" height="84" rx="8" fill={fill} transform={`rotate(${rot} 50 50)`} />
  )
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <g transform="translate(5 4)">
        {bar('#FF3D8B', 45)}
        {bar('#FF3D8B', -45)}
      </g>
      {bar('#C6FF3D', 45)}
      {bar('#C6FF3D', -45)}
    </svg>
  )
}

const storeBtn =
  'btn-press inline-flex min-h-14 min-w-[13.5rem] items-center gap-3 rounded-full bg-lime py-2 pr-6 pl-5 text-ink'

function StoreLabel({ small, big }: { small: string; big: string }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="text-[11px] font-bold tracking-wide uppercase opacity-80">{small}</span>
      <span className="mt-1 font-display text-lg font-black">{big}</span>
    </span>
  )
}

/** Both stores, same weight. Wraps on phones. */
export function StoreButtons({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {APP_STORE_URL ? (
        <a href={APP_STORE_URL} className={storeBtn}>
          <svg width="22" height="26" viewBox="0 0 384 512" aria-hidden="true">
            <path
              fill="currentColor"
              d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
            />
          </svg>
          <StoreLabel small="Download in de" big="App Store" />
        </a>
      ) : null}
      <a href={PLAY_STORE_URL} className={storeBtn}>
        <svg width="22" height="24" viewBox="0 0 20 22" aria-hidden="true">
          <path d="M1 1.5v19a1 1 0 0 0 1.5.86l16-9.5a1 1 0 0 0 0-1.72l-16-9.5A1 1 0 0 0 1 1.5z" fill="currentColor" />
        </svg>
        <StoreLabel small="Ontdek het op" big="Google Play" />
      </a>
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
