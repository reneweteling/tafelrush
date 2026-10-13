// Everything search engines and AI assistants read about the site: page metadata,
// the FAQ (shown on the landing page and in the FAQPage schema), JSON-LD and llms.txt.
// The FAQ answers follow what the app really does; check apps/mobile before changing them.

import { APP_STORE_URL, COMPANY, MAKER, MAKER_URL, PLAY_STORE_URL, SITE_URL } from '@tafelrush/shared'
import type { Metadata } from 'next'

export const NAME = 'Tafel Rush'
export const TAGLINE = 'Tafels oefenen door ze hardop te zeggen'
export const DESCRIPTION =
  'Gratis app voor iPhone en Android. De app zegt de som, jij zegt het antwoord hardop. Tafels 1 t/m 10 en eigen tafels tot 1000. Geen account, geen reclame.'
export const APP_STORE_ID = APP_STORE_URL?.match(/id(\d+)/)?.[1] ?? null
export const EMAIL = 'info@tafelrush.nl'

const STORES = [APP_STORE_URL, PLAY_STORE_URL].filter((u): u is string => Boolean(u))

/** Title, description, canonical, hreflang, Open Graph and Twitter for one page. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  // A page's own openGraph hides the root opengraph-image, so point at it again.
  const images = [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${NAME}: ${TAGLINE.toLowerCase()}` }]
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: path,
      languages: { 'nl-NL': path, 'nl-BE': path, 'x-default': path },
    },
    openGraph: { title, description, url: path, siteName: NAME, locale: 'nl_NL', alternateLocale: ['nl_BE'], type: 'website', images },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Hoe oefen je de tafels het best?',
    a: 'Kort en vaak. Een paar rondes van 10 sommen per dag werkt beter dan een uur in het weekend. Hardop antwoorden helpt, want je moet het antwoord zelf ophalen. Tafel Rush laat sommen die misgaan vaker terugkomen, zodat je oefent wat je nog niet kunt.',
  },
  {
    q: 'Is Tafel Rush gratis?',
    a: 'Ja. Tafel Rush is gratis voor iPhone en Android. Er is geen reclame en je kunt niks kopen in de app.',
  },
  {
    q: 'Werkt het zonder account?',
    a: 'Ja. Je maakt geen account en vult niks in. Je voortgang, ranks en instellingen staan alleen op je eigen telefoon.',
  },
  {
    q: 'Vanaf welke leeftijd is Tafel Rush?',
    a: 'Voor iedereen vanaf 6 jaar. De app praat een beetje als een tiener. Liever niet? Zet in de instellingen de jongerentaal uit met "Gewoon aardig".',
  },
  {
    q: 'Werkt het met spraak op iPhone en Android?',
    a: 'Ja. De app leest de som voor met de stem van je telefoon en verstaat je antwoord met de spraakherkenning van Apple of Google. Op Android kun je Nederlands downloaden, dan werkt het herkennen zonder internet. Liever typen? Zet "Typen in plaats van praten" aan in de instellingen.',
  },
  {
    q: 'Kan ik ook de tafel van 12 of 17 oefenen?',
    a: 'Ja. De tafels 1 t/m 10 staan klaar. Met "Eigen tafel" voeg je elke tafel van 1 t/m 1000 toe. De tafel van 17 is dan 1×17 tot en met 10×17.',
  },
  {
    q: 'Hoe weet de app welke sommen ik lastig vind?',
    a: 'Elke som heeft een eigen rank, van brons tot diamant. Binnen 3 seconden goed is een rank omhoog, fout of te laat zakt twee ranks. Een som die minstens twee keer fout ging en nog onder zilver zit, wordt een boss. Die komt vaker terug en levert dubbel XP op.',
  },
  {
    q: 'Kan ik iemand uitdagen?',
    a: 'Ja. Na een ronde stuur je een link of laat je een QR-code scannen. De ander krijgt precies dezelfde 10 sommen. Wie is sneller?',
  },
  {
    q: 'Wat gebeurt er met mijn gegevens?',
    a: 'Je voortgang blijft op je telefoon, wij krijgen hem niet. Alleen als je zelf ja zegt, deelt de app anonieme statistieken via Google Analytics for Firebase. Dat staat standaard uit en kan altijd weer uit.',
  },
]

const ORG_ID = `${SITE_URL}/#organization`
const SITE_ID = `${SITE_URL}/#website`
const APP_ID = `${SITE_URL}/#app`

/** Organization and WebSite: on every page. */
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: COMPANY,
        url: SITE_URL,
        email: EMAIL,
        logo: `${SITE_URL}/icon.png`,
        founder: { '@type': 'Person', name: MAKER, url: MAKER_URL },
      },
      {
        '@type': 'WebSite',
        '@id': SITE_ID,
        name: NAME,
        url: SITE_URL,
        inLanguage: 'nl',
        description: DESCRIPTION,
        publisher: { '@id': ORG_ID },
      },
    ],
  }
}

/** The app and the FAQ: on the landing page. */
export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MobileApplication',
        '@id': APP_ID,
        name: NAME,
        description: DESCRIPTION,
        url: SITE_URL,
        image: `${SITE_URL}/icon.png`,
        screenshot: SCREENS.map(([file]) => `${SITE_URL}/media/screens/${file}.webp`),
        operatingSystem: 'iOS, Android',
        applicationCategory: 'EducationalApplication',
        inLanguage: 'nl',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        installUrl: STORES,
        sameAs: STORES,
        teaches: 'Tafels van vermenigvuldiging',
        educationalLevel: 'Basisonderwijs',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', suggestedMinAge: 6 },
        author: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        inLanguage: 'nl',
        mainEntity: FAQ.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }
}

/** For a <script type="application/ld+json">; `<` escaped so the payload can't close the tag. */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c')

/** App screenshots in /public/media/screens: file, caption, alt text. */
export const SCREENS = [
  ['1-start', 'Kies je tafels, tot 1000', 'Startscherm van Tafel Rush: tafels 1 t/m 10 kiezen of een eigen tafel toevoegen'],
  ['2-luisteren', 'De app luistert', 'De app leest de som voor en luistert naar het antwoord'],
  ['3-goed', 'Goed: XP en combo', 'Goed antwoord: XP en een combo'],
  ['4-fout', 'Fout: wat de helly.', 'Fout antwoord: de app zegt het goede antwoord'],
  ['5-ranks', 'Elke som een rank', 'Overzicht van alle sommen met hun rank, van brons tot diamant'],
  ['6-delen', 'Deel je week', 'Weekrapport om te delen in de groepsapp'],
] as const

/** /llms.txt: a short, quotable description with links. `full` adds the FAQ. */
export function llmsTxt(full: boolean): string {
  const lines = [
    `# ${NAME}`,
    '',
    `> ${NAME} is een gratis Nederlandstalige app voor iPhone en Android om de tafels van vermenigvuldiging te oefenen door ze hardop te zeggen. De app leest een som voor, het kind zegt het antwoord hardop en de app reageert meteen.`,
    '',
    '## Wat de app doet',
    '',
    '- Een ronde is 10 sommen. De app leest elke som voor en de microfoon gaat vanzelf open. Na het starten hoeft het kind niks meer aan te tikken.',
    '- Tafels 1 t/m 10 staan klaar. Met "Eigen tafel" voeg je elke tafel van 1 t/m 1000 toe, zoals de tafel van 12, 17 of 125.',
    '- Slim oefenen: elke som heeft een eigen rank (brons, zilver, goud, platina, diamant). Binnen 3 seconden goed is een rank omhoog, fout of te laat zakt twee ranks.',
    '- Sommen die vaak misgaan worden bosses. Die komen vaker terug en leveren dubbel XP op.',
    '- Een fout antwoord zeg je één keer na, daarna komt de som later in de ronde terug.',
    '- XP, combo\'s en een weekrapport om te delen.',
    '- Uitdagen: stuur een link of QR-code, de ander krijgt precies dezelfde 10 sommen.',
    '- Typen in plaats van praten kan ook, via de instellingen.',
    '- Jongerentaal kan uit met de instelling "Gewoon aardig".',
    '',
    '## Voor wie',
    '',
    '- Kinderen vanaf 6 jaar, en ouders en leerkrachten in Nederland en Vlaanderen.',
    '- De app en de site zijn in het Nederlands.',
    '',
    '## Privacy',
    '',
    '- Geen account, geen reclame, geen aankopen in de app.',
    '- Voortgang, ranks en instellingen staan alleen op de telefoon zelf.',
    '- Spraakherkenning doet de telefoon zelf (Apple of Google). Tafel Rush ontvangt geen geluid.',
    '- Anonieme statistieken via Google Analytics for Firebase alleen als de speler daar zelf ja op zegt. Standaard staat het uit.',
    '- De website tafelrush.nl gebruikt geen analytics en geen cookies voor tracking.',
    '',
    '## Links',
    '',
    `- [Website](${SITE_URL}): uitleg, screenshots en veelgestelde vragen`,
    ...(APP_STORE_URL ? [`- [App Store (iPhone)](${APP_STORE_URL})`] : []),
    `- [Google Play (Android)](${PLAY_STORE_URL})`,
    `- [Privacy](${SITE_URL}/privacy): wat de app wel en niet bewaart`,
    ...(full ? [] : [`- [Volledige tekst met veelgestelde vragen](${SITE_URL}/llms-full.txt)`]),
    '',
    '## Maker',
    '',
    `${NAME} is gemaakt door ${MAKER} (${MAKER_URL}), ${COMPANY}. Contact: ${EMAIL}.`,
  ]
  if (full) {
    lines.push('', '## Veelgestelde vragen', '')
    for (const { q, a } of FAQ) lines.push(`### ${q}`, '', a, '')
  }
  return lines.join('\n').trimEnd() + '\n'
}
