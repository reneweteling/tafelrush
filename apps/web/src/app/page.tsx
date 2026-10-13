import { Footer, Header, StoreButtons } from '@/components/site'

const RANKS = [
  ['Brons', '#C9824A'],
  ['Zilver', '#BFC7D5'],
  ['Goud', '#FFC93D'],
  ['Platina', '#7FE3D8'],
  ['Diamant', '#C6FF3D'],
] as const

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      <Header />

      <main>
        <section className="grid items-center gap-12 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <div className="flex min-w-0 flex-col gap-6">
            <h1 className="font-display text-6xl leading-[0.9] font-black tracking-tight sm:text-7xl">
              TAFEL
              <br />
              <span className="text-lime">RUSH</span>
            </h1>
            <p className="max-w-[34ch] text-xl">
              Tafels oefenen door ze hardop te zeggen. De app zegt de som, jij zegt het antwoord. Niks tikken.
            </p>
            <StoreButtons />
          </div>

          <Phone />
        </section>

        <section className="grid gap-4 py-12 md:grid-cols-3">
          <Step n="1" title="De app zegt de som" text="Zeven keer acht? Daarna gaat de microfoon vanzelf open." />
          <Step n="2" title="Jij zegt het antwoord" text="Gewoon hardop. De timer kleurt van groen naar rood." />
          <Step
            n="3"
            title="Goed of fout"
            text="Goed levert XP en een combo op. Fout? Dan zeg je hem één keer na en komt hij later terug."
          />
        </section>

        <section className="grid items-center gap-10 py-12 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className="font-display text-3xl font-black">Slim oefenen</h2>
            <p className="max-w-[52ch] text-lg text-muted">
              Elke som van 1×1 tot 10×10 heeft een eigen rank. Wat lastig is komt vaker langs, wat zit komt af en toe
              terug zodat het niet wegzakt. Gaat de tafel van 7 steeds mis, dan merkt de app dat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RANKS.map(([name, color]) => (
              <span key={name} className="rounded-xl px-4 py-2 font-bold text-ink" style={{ background: color }}>
                {name}
              </span>
            ))}
            <span className="rounded-xl border-2 border-pink px-4 py-2 font-bold">Boss: dubbel XP</span>
          </div>
        </section>

        <section className="grid gap-4 py-12 md:grid-cols-2">
          <div className="rounded-3xl bg-pink p-8 text-ink">
            <h2 className="font-display text-3xl font-black">Daag iemand uit</h2>
            <p className="mt-3 text-lg font-bold">
              Stuur een link. Je vriendin krijgt precies dezelfde 10 sommen. Wie is sneller?
            </p>
          </div>
          <div className="rounded-3xl bg-surface p-8">
            <h2 className="font-display text-3xl font-black">Geen gedoe</h2>
            <p className="mt-3 text-lg text-muted">
              Geen account en geen reclame. Je voortgang blijft op je eigen telefoon. Anonieme statistieken alleen als je
              dat zelf wilt.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-surface p-6">
      <span className="font-display text-3xl font-black text-lime">{n}</span>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <p className="text-muted">{text}</p>
    </div>
  )
}

/** The listening screen of the app, drawn in HTML. */
function Phone() {
  return (
    <div className="mx-auto w-full max-w-[300px]" aria-hidden="true">
      <div className="flex aspect-[9/19] flex-col gap-5 rounded-[40px] border-[6px] border-lime bg-[#0F1A12] p-5">
        <div className="flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full w-[70%] rounded-full bg-lime" />
          </div>
          <span className="font-display text-xl font-black text-lime">5</span>
        </div>
        <div className="self-center rounded-full bg-pink px-3 py-1 text-xs font-bold text-ink">BOSS · dubbel XP</div>
        <div className="text-center font-display text-5xl font-black tracking-tighter">7×8</div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-sm">
            Zeven keer acht?
          </div>
          <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border-2 border-dashed border-lime px-3 py-2 text-sm">
            zesen...
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-lime">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#101018" strokeWidth="2.4" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
            </svg>
          </div>
          <span className="font-bold">Luistert...</span>
        </div>
      </div>
    </div>
  )
}
