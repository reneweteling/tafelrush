// What the app says. At most one in three lines uses youth slang, and only words
// with a Dutch source (Jeugdjournaal Kinderwoord 2025, VRT Tienerwoord 2025).
// The player can vote a line away as cringe; it never comes back.
// Pure, so it runs in Vitest.

export type PhraseKind =
  | 'goed'
  | 'combo'
  | 'boss'
  | 'fout'
  | 'telaat'
  | 'porren'
  | 'onthouden'
  | 'nogniet'
  | 'einde'
  | 'perfect'
  | 'zwak'
  | 'sixseven'

export type Phrase = {
  id: string
  kind: PhraseKind
  text: string
  /** Uses youth slang; left out when the setting "Met jongerentaal" is off. */
  slang?: boolean
}

// {som} = "7×8" on screen, "7 keer 8" spoken. {antwoord}, {combo}, {tafel}.
export const PHRASES: Phrase[] = [
  { id: 'g-slay', kind: 'goed', text: 'Slay.', slang: true },
  { id: 'g-tuff', kind: 'goed', text: 'Tuff.', slang: true },
  { id: 'g-clock', kind: 'goed', text: 'Clock it.', slang: true },
  { id: 'g-ja', kind: 'goed', text: 'Ja. Gewoon ja.' },
  { id: 'g-makkelijk', kind: 'goed', text: 'Te makkelijk.' },
  { id: 'g-goed', kind: 'goed', text: 'Goed.' },
  { id: 'g-klopt', kind: 'goed', text: 'Klopt.' },
  { id: 'g-netjes', kind: 'goed', text: 'Netjes.' },
  { id: 'g-zat', kind: 'goed', text: 'Die zat.' },

  { id: 'c-lowkey', kind: 'combo', text: 'Lowkey een rekenmachine.', slang: true },
  { id: 'c-wie', kind: 'combo', text: 'Combo {combo}. Wie ben jij?' },
  { id: 'c-normaal', kind: 'combo', text: 'Niet normaal. Combo {combo}.' },
  { id: 'c-door', kind: 'combo', text: 'Combo {combo}. Gewoon doorgaan.' },

  { id: 'b-down', kind: 'boss', text: 'Boss down. Tuff.', slang: true },
  { id: 'b-cooked', kind: 'boss', text: '{som} is cooked. Jij niet.', slang: true },
  { id: 'b-dubbel', kind: 'boss', text: 'Boss verslagen. Dubbel XP.' },

  { id: 'f-bruh', kind: 'fout', text: 'Bruh. Het is {antwoord}.', slang: true },
  { id: 'f-helly', kind: 'fout', text: 'Wat de helly. Het is {antwoord}.', slang: true },
  { id: 'f-yusu', kind: 'fout', text: 'Yusu? Echt? Het is {antwoord}.', slang: true },
  { id: 'f-nope', kind: 'fout', text: 'Nope. {antwoord}.' },
  { id: 'f-bijna', kind: 'fout', text: 'Bijna. Het is {antwoord}.' },
  { id: 'f-helaas', kind: 'fout', text: 'Helaas. {som} is {antwoord}.' },
  { id: 'f-mis', kind: 'fout', text: 'Mis. {antwoord}.' },

  { id: 't-hallo', kind: 'telaat', text: 'Hallo? Ben je er nog? Het is {antwoord}.' },
  { id: 't-bro', kind: 'telaat', text: 'Bro, ik zit hier gewoon te wachten. Het is {antwoord}.', slang: true },
  { id: 't-lag', kind: 'telaat', text: 'Even wat lag. Het is {antwoord}.' },
  { id: 't-tijd', kind: 'telaat', text: 'Tijd is op. Het is {antwoord}.' },

  { id: 'p-lowkey', kind: 'porren', text: 'Lowkey spannend.', slang: true },
  { id: 'p-nog', kind: 'porren', text: 'Nog even...' },
  { id: 'p-tiktak', kind: 'porren', text: 'Tik tak.' },

  { id: 'o-onthouden', kind: 'onthouden', text: 'Onthouden.' },
  { id: 'o-zo', kind: 'onthouden', text: 'Zo. Die zit erin.' },

  { id: 'n-terug', kind: 'nogniet', text: 'Het is {antwoord}. Die komt zo terug.' },

  { id: 'e-tuff', kind: 'einde', text: 'Tuff ronde.', slang: true },
  { id: 'e-lowkey', kind: 'einde', text: 'Lowkey goed bezig.', slang: true },
  { id: 'e-netjes', kind: 'einde', text: 'Netjes gedaan.' },
  { id: 'e-klaar', kind: 'einde', text: 'Ronde klaar.' },
  { id: 'e-volgende', kind: 'einde', text: 'Op naar de volgende.' },

  { id: 'x-clock', kind: 'perfect', text: 'Tien uit tien. Clock it.', slang: true },
  { id: 'x-alles', kind: 'perfect', text: 'Alles goed. Echt alles.' },

  { id: 'z-cooked', kind: 'zwak', text: 'De tafel van {tafel} is nog een beetje cooked.', slang: true },
  { id: 'z-lastig', kind: 'zwak', text: 'De tafel van {tafel} blijft lastig.' },

  { id: 's-67', kind: 'sixseven', text: 'Six seven!', slang: true },
]

export type PhraseVars = { a?: number; b?: number; antwoord?: number; combo?: number; tafel?: number }

/** Text for the screen (7×8) and for the voice (7 keer 8). */
export function fill(text: string, vars: PhraseVars): { shown: string; spoken: string } {
  const som = vars.a !== undefined && vars.b !== undefined
  const base = (s: string) =>
    s
      .replace(/\{antwoord\}/g, String(vars.antwoord ?? ''))
      .replace(/\{combo\}/g, String(vars.combo ?? ''))
      .replace(/\{tafel\}/g, String(vars.tafel ?? ''))
  return {
    shown: base(som ? text.replace(/\{som\}/g, `${vars.a}×${vars.b}`) : text),
    spoken: base(som ? text.replace(/\{som\}/g, `${vars.a} keer ${vars.b}`) : text),
  }
}

/**
 * A random line of `kind`, never the one used last time for that kind, never a
 * banned one. Falls back to any line of the kind so the app is never silent.
 */
export function pickPhrase(
  kind: PhraseKind,
  opts: { slang: boolean; banned: string[]; lastId?: string; rng?: () => number },
): Phrase | null {
  const rng = opts.rng ?? Math.random
  const all = PHRASES.filter((p) => p.kind === kind)
  let list = all.filter((p) => (opts.slang || !p.slang) && !opts.banned.includes(p.id))
  if (list.length > 1) list = list.filter((p) => p.id !== opts.lastId)
  if (list.length === 0) list = all.filter((p) => !p.slang)
  if (list.length === 0) return null
  return list[Math.floor(rng() * list.length)]
}
