import { COMPANY, MAKER, MAKER_URL } from '@tafelrush/shared'
import type { Metadata } from 'next'

import { Footer, Header } from '@/components/site'

export const metadata: Metadata = { title: 'Privacy' }

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-5">
      <Header />
      <main className="flex flex-col gap-6 py-10 text-lg leading-relaxed [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_p]:text-muted">
        <h1 className="font-display text-4xl font-black">Privacy</h1>
        <p>
          Tafel Rush is gemaakt door {MAKER}, {COMPANY}. Kort gezegd: er is geen account en geen reclame, en de app
          verzamelt niks over jou. Alleen als je daar zelf ja op zegt, gaan er anonieme gebruiksstatistieken naar Google
          Analytics.
        </p>

        <h2>Wat op je telefoon blijft</h2>
        <p>
          Je voortgang, je ranks, je instellingen en de naam die je eventueel invult staan alleen op je eigen telefoon. Wij
          krijgen ze niet. Wissen kan in de app via Instellingen, Voortgang wissen, of door de app te verwijderen.
        </p>

        <h2>Microfoon en spraak</h2>
        <p>
          De microfoon staat alleen aan tijdens een ronde, om je antwoord te horen. Het omzetten van je stem naar een getal
          doet de spraakherkenning van je telefoon zelf: op Android die van Google, op een iPhone die van Apple. Afhankelijk
          van je telefoon gebeurt dat op het toestel of bij hen, onder hun eigen privacyvoorwaarden. Wij ontvangen geen
          geluid en slaan niks op. Voorlezen doet de stem van je telefoon.
        </p>

        <h2>Statistieken</h2>
        <p>
          Na je eerste ronde vraagt de app één keer of je anonieme statistieken wilt delen. Ben je jonger dan 16, dan vraag
          je dat aan je ouder. Zeg je ja, dan stuurt de app via Google Analytics for Firebase (Google Ireland) wat er in de
          app gebeurt: welke schermen je opent, hoeveel rondes je speelt, welke sommen goed of fout gaan, hoe snel, en of je
          praat of typt. Daarbij hoort een willekeurig app-nummer dat niet aan jou of je telefoon gekoppeld is. Nooit je
          naam, nooit wat je zegt, geen reclame-ID. We gebruiken het alleen om de app beter te maken. Uitzetten kan altijd in
          de instellingen; Google bewaart de gegevens maximaal 14 maanden.
        </p>

        <h2>Uitdagingen</h2>
        <p>
          Een uitdaging is een link met daarin de 10 sommen, de score, de tijd en de naam die je invulde. Die link stuur je
          zelf door. Opent iemand hem op tafelrush.nl, dan houdt de webserver een gewoon toegangslog bij (IP-adres, tijd,
          pagina). Dat bewaren we kort en gebruiken we alleen om de site werkend te houden.
        </p>

        <h2>Vragen</h2>
        <p>
          Neem contact op via{' '}
          <a href={MAKER_URL} className="text-fg underline">
            weteling.com
          </a>
          .
        </p>
        <p className="text-sm">Laatst bijgewerkt: 13 oktober 2026.</p>
      </main>
      <Footer />
    </div>
  )
}
