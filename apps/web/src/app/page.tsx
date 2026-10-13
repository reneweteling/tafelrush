import type { CSSProperties } from 'react'

import { PromoVideo, Reveal } from '@/components/motion'
import { Footer, Header, Mark, StoreButtons } from '@/components/site'

type Vars = CSSProperties & Record<`--${string}`, string | number>

const RANK = {
  N: ['geen', '#2E2E40'],
  B: ['brons', '#C9824A'],
  Z: ['zilver', '#BFC7D5'],
  G: ['goud', '#FFC93D'],
  P: ['platina', '#7FE3D8'],
  D: ['diamant', '#C6FF3D'],
} as const
type RankKey = keyof typeof RANK

// Same board as the ranks screen in the app. A trailing ! marks a boss.
const BOARD = [
  'D D P D D P D D D D',
  'D D D D P D D D D P',
  'D D G G D Z Z G Z D',
  'D P G P P G G G P P',
  'D D D P D D D D D D',
  'D D Z G D G G Z G P',
  'P D G N! D B! N! B! Z P',
  'D D G G D P Z P G D',
  'D D Z Z D P G G G D',
  'D D P D D D P D D P',
].map((row) => row.split(' ').map((c) => ({ rank: c[0] as RankKey, boss: c.endsWith('!') })))

const TICKER = [
  '7×8 = 56',
  '6×9 = 54',
  'COMBO ×4',
  '8×7 = 56',
  '9×9 = 81',
  'BRUH.',
  '4×7 = 28',
  '6×8 = 48',
  '+40 XP',
  '3×9 = 27',
  '7×7 = 49',
  'SLAY',
  '8×8 = 64',
  '6×7 = 42',
  'WAT DE HELLY.',
]

const FLOATERS = [
  { t: '7×8', x: '6%', y: '12%', s: 2.2, d: 9 },
  { t: '56', x: '82%', y: '8%', s: 3, d: 11 },
  { t: '6×9', x: '70%', y: '62%', s: 1.8, d: 8 },
  { t: '9×9', x: '12%', y: '70%', s: 2.6, d: 12 },
  { t: '81', x: '44%', y: '86%', s: 1.6, d: 10 },
  { t: '4×7', x: '92%', y: '40%', s: 1.4, d: 7 },
  { t: '×', x: '38%', y: '4%', s: 3.4, d: 13 },
  { t: '64', x: '2%', y: '44%', s: 1.5, d: 9.5 },
]

const SCREENS = [
  ['1-start', 'Kies je tafels'],
  ['2-luisteren', 'De app luistert'],
  ['3-goed', 'Goed: XP en combo'],
  ['4-fout', 'Fout: wat de helly.'],
  ['5-ranks', 'Elke som een rank'],
  ['6-delen', 'Deel je week'],
] as const

export default function Home() {
  return (
    <>
      <Reveal />
      <div className="mx-auto max-w-6xl px-5">
        <Header />
      </div>

      <main>
        <Hero />
        <Ticker />
        <Demo />
        <Showcase />
        <Ranks />
        <Challenge />
        <FinalCta />
      </main>

      <div className="mx-auto max-w-6xl px-5">
        <Footer />
      </div>
    </>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-glow absolute top-1/2 left-1/4 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
        {FLOATERS.map((f) => (
          <span
            key={f.t + f.x}
            className="float-sum absolute font-display font-black text-fg/[0.07]"
            style={{ left: f.x, top: f.y, fontSize: `${f.s}rem`, '--dur': `${f.d}s` } as Vars}
          >
            {f.t}
          </span>
        ))}
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-6 pb-16 md:grid-cols-[1.15fr_1fr] md:pt-10 md:pb-24">
        <div className="flex min-w-0 flex-col gap-7">
          <div className="hero-in flex items-center gap-3" style={{ '--d': '0ms' } as Vars}>
            <span className="rounded-full border-2 border-line px-3 py-1 text-xs font-bold tracking-widest text-muted uppercase">
              Gratis voor iPhone en Android
            </span>
          </div>

          <h1 className="relative font-display text-[clamp(3.6rem,15vw,8.25rem)] leading-[0.86] font-black tracking-tight">
            <span className="sr-only">Tafel Rush</span>
            <span aria-hidden="true" className="block">
              <span className="slam">
                {'TAFEL'.split('').map((ch, i) => (
                  <span key={i} style={{ '--i': i } as Vars}>
                    {ch}
                  </span>
                ))}
              </span>
            </span>
            <span aria-hidden="true" className="flex items-center gap-[0.12em]">
              <span className="glitch slam text-lime">
                {'RUSH'.split('').map((ch, i) => (
                  <span key={i} style={{ '--i': i + 5 } as Vars}>
                    {ch}
                  </span>
                ))}
              </span>
              <span className="punch inline-block">
                <span className="spin-idle inline-block">
                  <Mark size={64} className="size-[0.62em]" />
                </span>
              </span>
            </span>
          </h1>

          <p className="hero-in max-w-[30ch] text-xl sm:text-2xl" style={{ '--d': '900ms' } as Vars}>
            Tafels oefenen door ze <span className="font-bold text-lime">hardop te zeggen</span>. De app zegt de som,
            jij zegt het antwoord. Niks tikken.
          </p>

          <div className="hero-in" style={{ '--d': '1050ms' } as Vars}>
            <StoreButtons />
          </div>

          <ul className="hero-in flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-muted" style={{ '--d': '1200ms' } as Vars}>
            <li>Geen account</li>
            <li>Geen reclame</li>
            <li>Tafels 1 t/m 10</li>
          </ul>
        </div>

        <div className="hero-in min-w-0" style={{ '--d': '400ms' } as Vars}>
          <PromoVideo />
        </div>
      </div>
    </section>
  )
}

function Ticker({ reverse = false, tone = 'lime' }: { reverse?: boolean; tone?: 'lime' | 'pink' }) {
  const items = [...TICKER, ...TICKER]
  return (
    <div className="overflow-hidden py-8" aria-hidden="true">
      <div
        className={`ticker-band -mx-[5%] w-[110%] py-3 ${tone === 'lime' ? 'bg-lime -rotate-2' : 'bg-pink rotate-2'} text-ink`}
      >
        <div className={`marquee-track flex w-max ${reverse ? 'marquee-reverse' : ''}`}>
          {items.map((t, i) => (
            <span key={i} className="flex shrink-0 items-center font-display text-xl font-black whitespace-nowrap sm:text-2xl">
              <span className="px-5">{t}</span>
              <span className="text-[0.7em]">✕</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHead({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div data-reveal className="flex max-w-2xl flex-col gap-4">
      <span className="text-sm font-bold tracking-widest text-lime uppercase">{kicker}</span>
      <h2 className="font-display text-4xl leading-[0.95] font-black sm:text-5xl">{title}</h2>
      {text ? <p className="text-lg text-muted">{text}</p> : null}
    </div>
  )
}

function Demo() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <SectionHead
        kicker="Zo werkt het"
        title="Zeg het. Snel."
        text="De app vraagt de som en de microfoon gaat vanzelf open. Hoe sneller je bent, hoe meer XP."
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:gap-10">
        <div data-reveal style={{ '--d': '0ms' } as Vars}>
          <p className="mb-3 font-display text-sm font-black tracking-widest text-lime">GOED</p>
          <DemoCard good />
        </div>
        <div data-reveal style={{ '--d': '150ms' } as Vars}>
          <p className="mb-3 font-display text-sm font-black tracking-widest text-pink">FOUT</p>
          <DemoCard good={false} />
        </div>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <Step d={0} n="1" title="De app zegt de som" text="Zeven keer acht? Daarna gaat de microfoon vanzelf open." />
        <Step d={120} n="2" title="Jij zegt het antwoord" text="Gewoon hardop. De timer kleurt van groen naar roze." />
        <Step
          d={240}
          n="3"
          title="Goed of fout"
          text="Goed levert XP en een combo op. Fout? Dan zeg je hem één keer na en komt hij later terug."
        />
      </div>
    </section>
  )
}

/** A looping, CSS-only replay of one sum in the app. */
function DemoCard({ good }: { good: boolean }) {
  const q = good ? 'Zeven keer acht?' : 'Zes keer negen?'
  const sum = good ? '7×8' : '6×9'
  const said = good ? 'zesenvijftig' : 'tweeënvijftig'
  return (
    <div
      className={`demo ${good ? '' : 'demo-bad'} relative h-[400px] overflow-hidden rounded-[32px] border-2 border-line bg-[#0F1A12] p-5`}
      style={{ '--dur': '6.5s', '--delay': good ? '0s' : '-2.2s' } as Vars}
      role="img"
      aria-label={
        good
          ? 'De app vraagt zeven keer acht, jij zegt zesenvijftig: goed, plus 40 XP, combo keer 4.'
          : 'De app vraagt zes keer negen, jij zegt tweeënvijftig: fout, het is 54.'
      }
    >
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
          <i className="d-timer block h-full rounded-full bg-lime" />
        </div>
        <span className="font-display text-lg font-black text-lime">{good ? '4' : '2'}/10</span>
      </div>

      <div className="d-sum mt-10 text-center font-display text-6xl font-black tracking-tighter">{sum}</div>

      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2">
        <div className="d-q max-w-[85%] self-start rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-sm">{q}</div>
        <div className="d-a max-w-[85%] self-end rounded-2xl rounded-br-md border-2 border-dashed border-lime px-3 py-2 text-sm">
          {said}
        </div>
        <div className="d-mic mt-1 flex items-center justify-center gap-3">
          <span className="mic-pulse flex size-11 items-center justify-center rounded-full bg-lime">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#101018" strokeWidth="2.4" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
          </span>
          <span className="font-bold">Luistert...</span>
        </div>
      </div>

      {good ? (
        <div className="d-flash absolute inset-0 flex flex-col items-center justify-center gap-4 bg-lime p-5 text-ink">
          <span className="font-display text-xl font-black">7×8 =</span>
          <span className="d-big font-display text-[7rem] leading-none font-black tracking-tighter">56</span>
          <div className="flex items-center gap-2">
            <span className="d-xp rounded-full bg-ink px-3 py-1 text-sm font-bold text-fg">+40 XP</span>
            <span className="d-combo rounded-full bg-pink px-3 py-1 font-display text-sm font-black">COMBO ×4</span>
          </div>
          <span className="d-xp mt-2 rounded-2xl bg-ink px-4 py-2 font-bold text-fg">Slay. Tuff.</span>
        </div>
      ) : (
        <div className="d-flash absolute inset-0 flex flex-col items-center justify-center gap-6 bg-pink p-5 text-ink">
          <span className="d-glitch text-center font-display text-5xl leading-[0.9] font-black">
            WAT DE
            <br />
            HELLY.
          </span>
          <div className="flex items-baseline gap-3 font-display font-black">
            <span className="text-2xl">6×9 =</span>
            <span className="relative text-3xl opacity-60">
              52
              <i className="d-strike absolute top-1/2 left-[-8%] h-1 w-[116%] -rotate-6 rounded-full bg-ink" />
            </span>
            <span className="d-fix text-6xl">54</span>
          </div>
          <span className="d-xp rounded-2xl bg-ink px-4 py-2 font-bold text-fg">Wat de helly. Het is 54.</span>
        </div>
      )}
    </div>
  )
}

function Step({ n, title, text, d }: { n: string; title: string; text: string; d: number }) {
  return (
    <div
      data-reveal
      style={{ '--d': `${d}ms` } as Vars}
      className="lift flex flex-col gap-3 rounded-3xl border-2 border-transparent bg-surface p-6"
    >
      <span className="font-display text-4xl font-black text-lime">{n}</span>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      <p className="text-muted">{text}</p>
    </div>
  )
}

function Showcase() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead kicker="De app" title="Zo ziet het eruit" />
      </div>
      <div className="mx-auto max-w-6xl">
        <ul className="shots mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pt-4 pb-8">
          {SCREENS.map(([file, label], i) => (
            <li
              key={file}
              data-reveal
              style={{ '--d': `${i * 90}ms`, '--tilt': `${i % 2 ? 2 : -2}deg` } as Vars}
              className="w-[220px] shrink-0 snap-center sm:w-[240px]"
            >
              <figure className="shot flex flex-col gap-3">
                <div className="overflow-hidden rounded-[28px] border-4 border-line bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/media/screens/${file}.webp`}
                    alt={label}
                    width={540}
                    height={1200}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </div>
                <figcaption className="text-center font-bold">{label}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Ranks() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
      <div className="flex min-w-0 flex-col gap-6">
        <SectionHead
          kicker="Slim oefenen"
          title="Elke som een rank"
          text="Van 1×1 tot 10×10 heeft elke som een eigen rank. Snel goed is een rank omhoog. Fout of te laat zakt twee ranks. Gaat de tafel van 7 steeds mis? De app clockt het."
        />
        <div data-reveal className="flex flex-wrap gap-2" style={{ '--d': '120ms' } as Vars}>
          {(['B', 'Z', 'G', 'P', 'D'] as const).map((k) => (
            <span key={k} className="rounded-xl px-3 py-1.5 text-sm font-bold text-ink capitalize" style={{ background: RANK[k][1] }}>
              {RANK[k][0]}
            </span>
          ))}
        </div>
        <div data-reveal className="boss-card rounded-3xl border-2 border-pink p-5" style={{ '--d': '200ms' } as Vars}>
          <p className="font-display text-xl font-black text-pink">Bosses</p>
          <p className="mt-1 text-muted">
            Zwakke sommen worden bosses. Die komen vaker terug en leveren dubbel XP op als je ze verslaat.
          </p>
        </div>
      </div>

      <div data-reveal="grid" className="ranks mx-auto w-full max-w-[460px] min-w-0">
        <div className="grid grid-cols-[1.2rem_repeat(10,minmax(0,1fr))] gap-1 sm:gap-1.5">
          <span className="text-center text-xs text-muted">×</span>
          {BOARD[0].map((_, c) => (
            <span key={c} className="text-center text-xs text-muted">
              {c + 1}
            </span>
          ))}
          {BOARD.map((row, r) => (
            <Row key={r} r={r} row={row} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Row({ r, row }: { r: number; row: (typeof BOARD)[number] }) {
  return (
    <>
      <span className="self-center text-center text-xs text-muted">{r + 1}</span>
      {row.map(({ rank, boss }, c) => {
        const [name, color] = RANK[rank]
        return (
          <span
            key={c}
            title={`${r + 1}×${c + 1} = ${(r + 1) * (c + 1)} · ${boss ? 'boss' : name}`}
            className={`rank-cell aspect-square rounded-[22%] ${boss ? 'is-boss' : ''}`}
            style={{ '--c': color, '--i': r + c } as Vars}
          />
        )
      })}
    </>
  )
}

/** A fake but QR-looking pattern; the real code lives in the app. */
function FakeQr() {
  const n = 21
  const cells: [number, number][] = []
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    for (const [ox, oy] of [
      [0, 0],
      [14, 0],
      [0, 14],
    ]) {
      if (inBox(ox, oy)) {
        const dx = x - ox
        const dy = y - oy
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0
      }
    }
    return -1
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y)
      const on = f === -1 ? (x * 7 + y * 13 + x * y * 3) % 5 < 2 : f === 1
      if (on) cells.push([x, y])
    }
  return (
    <svg viewBox="-2 -2 25 25" className="size-full" aria-hidden="true">
      <rect x="-2" y="-2" width="25" height="25" rx="2" fill="#F4F4F8" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="#101018" />
      ))}
    </svg>
  )
}

function Challenge() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_1.1fr]">
        <SectionHead
          kicker="Samen"
          title="Daag iemand uit"
          text="Stuur een link of laat de QR scannen. Sanne krijgt precies dezelfde 10 sommen. Wie is sneller?"
        />

        <div className="relative mx-auto w-full max-w-md">
          <div data-reveal="tilt" className="challenge-card relative rounded-[32px] bg-pink p-7 text-ink sm:p-8">
            <p className="text-xs font-bold tracking-widest uppercase">Uitdaging</p>
            <p className="mt-2 font-display text-3xl leading-tight font-black sm:text-4xl">Sanne daagt je uit</p>
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-4xl font-black sm:text-5xl">9/10</p>
                <p className="font-bold">in 41 sec</p>
                <p className="mt-3 max-w-[18ch] font-bold">Zelfde 10 sommen. Kun jij het beter?</p>
              </div>
              <div className="size-28 shrink-0 rotate-3 sm:size-32">
                <FakeQr />
              </div>
            </div>
          </div>
          <span
            data-reveal="pop"
            style={{ '--d': '450ms' } as Vars}
            className="absolute -top-4 -right-1 rotate-6 rounded-full bg-lime px-4 py-2 font-display text-sm font-black text-ink sm:-right-4"
          >
            Clock it.
          </span>
        </div>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-2">
        <div data-reveal className="lift rounded-3xl border-2 border-transparent bg-surface p-8">
          <h3 className="font-display text-2xl font-black">Weekrapport</h3>
          <p className="mt-3 text-lg text-muted">
            Elke week zie je wat je hebt gedaan. Deel het in de groepsapp en flex een beetje. Lowkey.
          </p>
        </div>
        <div data-reveal style={{ '--d': '120ms' } as Vars} className="lift rounded-3xl border-2 border-transparent bg-surface p-8">
          <h3 className="font-display text-2xl font-black">Geen gedoe</h3>
          <p className="mt-3 text-lg text-muted">
            Geen account en geen reclame. Je voortgang blijft op je eigen telefoon. Anonieme statistieken alleen als je
            dat zelf wilt.
          </p>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="pt-8">
      <Ticker reverse tone="pink" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-5 pt-12 text-center">
        <div data-reveal="pop">
          <Mark size={96} className="spin-idle" />
        </div>
        <h2 data-reveal className="font-display text-5xl leading-[0.95] font-black sm:text-7xl">
          Tafels, maar
          <br />
          dan <span className="text-lime">tuff.</span>
        </h2>
        <p data-reveal className="text-lg text-muted" style={{ '--d': '100ms' } as Vars}>
          Gratis voor iPhone en Android. Geen account. Gewoon beginnen.
        </p>
        <div data-reveal style={{ '--d': '200ms' } as Vars} className="flex justify-center">
          <StoreButtons className="justify-center" />
        </div>
      </div>
    </section>
  )
}
