// Turns what the speech recognizer heard into a number: "56", "zesenvijftig",
// "zes en vijftig", "eh is het zesenvijftig". Pure, so it runs in Vitest.

const UNITS = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen']
const TEENS = [
  'tien',
  'elf',
  'twaalf',
  'dertien',
  'veertien',
  'vijftien',
  'zestien',
  'zeventien',
  'achttien',
  'negentien',
]
const TENS = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig']

function buildWords(): Map<string, number> {
  const words = new Map<string, number>()
  UNITS.forEach((w, n) => words.set(w, n))
  TEENS.forEach((w, i) => words.set(w, 10 + i))
  for (let t = 2; t <= 9; t++) {
    words.set(TENS[t], t * 10)
    for (let u = 1; u <= 9; u++) words.set(`${UNITS[u]}en${TENS[t]}`, t * 10 + u)
  }
  words.set('honderd', 100)
  words.set('eenhonderd', 100)
  return words
}

const WORDS = buildWords()

/** Lower case, accents off (één, tweeënvijftig), only letters, digits and spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The last number in the text, or null. The last one, because a child may say
 * "zeven keer acht is zesenvijftig". Up to three words are joined, so
 * "zes en vijftig" also counts.
 */
export function parseDutchNumber(text: string): number | null {
  const tokens = wordTokens(text)
  for (let end = tokens.length; end > 0; end--) {
    for (let size = Math.min(3, end); size >= 1; size--) {
      const joined = tokens.slice(end - size, end).join('')
      if (/^\d{1,3}$/.test(joined)) return Number(joined)
      const n = WORDS.get(joined)
      if (n !== undefined) return n
    }
  }
  return null
}

/**
 * Tokens with lone digits written out, so a recognizer that mixes digits and
 * words ("6 en 50") still reads as one number ("zesenvijftig").
 */
function wordTokens(text: string): string[] {
  const tokens = normalize(text).split(' ').filter(Boolean)
  const mixed = tokens.some((t) => /^\d+$/.test(t)) && tokens.some((t) => t === 'en')
  if (!mixed) return tokens
  return tokens.map((t) => {
    if (/^[0-9]$/.test(t)) return UNITS[Number(t)]
    if (/^[2-9]0$/.test(t)) return TENS[Number(t[0])]
    return t
  })
}

/**
 * True when the number at the end of what was heard cannot grow any more, so it
 * can be taken right away. "zes" may still become "zesenvijftig" and "zes en"
 * certainly will; "zesenvijftig", "zestien" and "56" are done.
 */
export function numberIsComplete(text: string): boolean {
  const tokens = normalize(text).split(' ').filter(Boolean)
  const last = tokens[tokens.length - 1]
  if (!last || last === 'en') return false
  const n = parseDutchNumber(text)
  return n !== null && n >= 10
}

/** Spoken form, for when the app reads a number aloud in a sentence. */
export function dutchNumberWord(n: number): string {
  for (const [word, value] of WORDS) {
    // Dutch writes a diaeresis where two e's would otherwise merge: tweeënvijftig, drieënveertig.
    if (value === n && word.length > 1 && word !== 'eenhonderd') return word.replace(/^(twee|drie)en/, '$1ën')
  }
  return String(n)
}
