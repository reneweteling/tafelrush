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
  return words
}

/** 0..99 as one word: "zevenenzestig". */
const WORDS = buildWords()

/** Largest number this parser reads: 1000 × 10 and a bit. */
export const MAX_NUMBER = 99999

/** "honderd", "vierhonderdzevenenzestig", "honderd en een": 0..999, or null. */
function parseHundreds(w: string): number | null {
  if (w === '') return 0
  const small = WORDS.get(w)
  if (small !== undefined) return small
  const at = w.indexOf('honderd')
  if (at === -1) return null
  const head = w.slice(0, at)
  const h = head === '' || head === 'een' ? 1 : WORDS.get(head)
  if (h === undefined || h < 1 || h > 9) return null
  let rest = w.slice(at + 'honderd'.length)
  if (rest.startsWith('en') && WORDS.has(rest.slice(2)) && !WORDS.has(rest)) rest = rest.slice(2)
  const r = rest === '' ? 0 : WORDS.get(rest)
  if (r === undefined || (rest !== '' && r === 0)) return null
  return h * 100 + r
}

/** Spoken words glued together ("drieduizendvierhonderdzevenenzestig"): 0..99999, or null. */
function parseWords(w: string): number | null {
  const at = w.indexOf('duizend')
  if (at === -1) return parseHundreds(w)
  const head = w.slice(0, at)
  const k = head === '' || head === 'een' ? 1 : parseHundreds(head)
  if (k === null || k < 1 || k > 99) return null
  let rest = w.slice(at + 'duizend'.length)
  if (rest.startsWith('en') && parseHundreds(rest.slice(2)) !== null && parseHundreds(rest) === null) rest = rest.slice(2)
  const r = parseHundreds(rest)
  if (r === null || (rest !== '' && r === 0)) return null
  return k * 1000 + r
}

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
 * "zeven keer acht is zesenvijftig". Words are joined, so "zes en vijftig"
 * and "vier honderd zeven en zestig" also count.
 */
export function parseDutchNumber(text: string): number | null {
  const tokens = wordTokens(text)
  for (let end = tokens.length; end > 0; end--) {
    for (let size = Math.min(MAX_TOKENS, end); size >= 1; size--) {
      const part = tokens.slice(end - size, end)
      const joined = part.join('')
      // "3450", or "3 450" / "3.450" with the thousands written apart.
      if (/^\d{1,5}$/.test(joined) && (size === 1 || (size === 2 && /^\d{1,2}$/.test(part[0]) && /^\d{3}$/.test(part[1])))) {
        return Number(joined)
      }
      if (/\d/.test(joined)) continue
      const n = parseWords(joined)
      if (n !== null) return n
    }
  }
  return null
}

/** "drie duizend vier honderd zeven en zestig" is seven words. */
const MAX_TOKENS = 8

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
 * certainly will; "zesenvijftig", "zestien" and "56" are done. With an expected
 * answer of 100 or more, "vierhonderd" may still grow, so only the right answer
 * is taken early; anything else waits for the pause.
 */
export function numberIsComplete(text: string, expected?: number): boolean {
  const tokens = normalize(text).split(' ').filter(Boolean)
  const last = tokens[tokens.length - 1]
  if (!last || last === 'en') return false
  const n = parseDutchNumber(text)
  if (n === null) return false
  if (expected !== undefined && n === expected) return true
  if (expected !== undefined && expected >= 100) return false
  return n >= 10
}

/** Spoken form, for when the app reads a number aloud in a sentence: "vierhonderdzevenenzestig". */
export function dutchNumberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > MAX_NUMBER) return String(n)
  return diaeresis(numberWord(n))
}

function numberWord(n: number): string {
  if (n < 100) {
    for (const [word, value] of WORDS) if (value === n) return word
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const r = n % 100
    return `${h === 1 ? '' : numberWord(h)}honderd${r ? numberWord(r) : ''}`
  }
  const k = Math.floor(n / 1000)
  const r = n % 1000
  return `${k === 1 ? '' : numberWord(k)}duizend${r ? ` ${numberWord(r)}` : ''}`
}

/** Dutch writes a diaeresis where two e's would otherwise merge: tweeënvijftig, drieënveertig. */
function diaeresis(word: string): string {
  return word.replace(/(twee|drie)en(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)/g, '$1ën$2')
}
