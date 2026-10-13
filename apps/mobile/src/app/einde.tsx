import { challengeUrl, decodeChallenge, encodeChallenge, parseKey, RANKS, RANK_COLORS, weakestTable } from '@tafelrush/shared'
import { router } from 'expo-router'
import { ThumbsDown } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native'

import { Button, Chip, Screen, styles as ui, Txt } from '@/components/ui'
import { fill, PHRASES, pickPhrase } from '@/lib/phrases'
import { track } from '@/lib/analytics'
import { play } from '@/lib/sfx'
import { getState, setState, useStore } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'
import { say } from '@/lib/voice'

export default function Einde() {
  const result = useStore((s) => s.lastRound)
  const progress = useStore((s) => s.progress)
  const banned = useStore((s) => s.banned)
  const [voting, setVoting] = useState(false)

  const weak = weakestTable(progress)
  const line = useMemo(() => {
    if (!result) return null
    const { settings } = getState()
    const p = pickPhrase(result.score === result.total ? 'perfect' : 'einde', { slang: settings.slang, banned: getState().banned })
    return p ? fill(p.text, {}) : null
  }, [result])

  useEffect(() => {
    if (!result) return
    if (result.score >= 8) play('airhorn')
    if (line) void say(line.spoken)
  }, [result, line])

  if (!result) {
    return (
      <Screen>
        <Txt variant="title">Geen ronde gevonden</Txt>
        <Button label="Naar start" onPress={() => router.replace('/')} />
      </Screen>
    )
  }

  const changes = Object.entries(result.rankChanges)
  const weakLine = weak ? fill(pickPhrase('zwak', { slang: getState().settings.slang, banned })?.text ?? '', { tafel: weak }).shown : null
  const used = PHRASES.filter((p) => result.phraseIds.includes(p.id))

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: space.xl, paddingBottom: space.l }} showsVerticalScrollIndicator={false}>
        <Txt variant="label" color={colors.muted}>
          Ronde klaar
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 96, lineHeight: 96, letterSpacing: -4 }}>{result.score}</Txt>
          <Txt style={{ fontFamily: fonts.display, fontSize: 44, lineHeight: 70 }} color={colors.muted}>
            /{result.total}
          </Txt>
        </View>
        {line ? <Txt variant="bodyBold" style={{ fontSize: 18, marginTop: -space.m }}>{line.shown}</Txt> : null}

        <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`${result.score} goed`}>
          {result.outcomes.map((o, i) => (
            <View
              key={i}
              style={[s.cell, { backgroundColor: o === 'goed' ? colors.lime : o === 'fout' ? colors.pink : colors.cyan }]}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Stat value={`+${result.xp}`} label="XP" />
          <Stat value={`${result.seconds}s`} label="denktijd" />
          <Stat value={`×${result.bestCombo}`} label="beste combo" />
        </View>

        {weakLine || changes.length > 0 ? (
          <View style={[ui.card, { borderWidth: 2, borderColor: weak ? colors.pink : colors.line, gap: space.m }]}>
            {weakLine ? (
              <>
                <Txt variant="bodyBold">{weakLine}</Txt>
                <Txt variant="small" color={colors.muted}>
                  Volgende ronde met Slimme mix krijg je er extra veel.
                </Txt>
              </>
            ) : (
              <Txt variant="bodyBold">Ranks veranderd</Txt>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
              {changes.slice(0, 6).map(([k, [before, after]]) => {
                const sum = parseKey(k)
                const up = after > before
                return (
                  <Chip
                    key={k}
                    label={`${sum.a}×${sum.b} ${up ? RANKS[after].toLowerCase() : 'gezakt'}`}
                    background={up ? RANK_COLORS[after] : colors.line}
                    color={up && after > 0 ? colors.ink : colors.text}
                  />
                )
              })}
            </View>
          </View>
        ) : null}

        {voting ? (
          <View style={[ui.card, { gap: space.s }]}>
            <Txt variant="bodyBold">Tik de cringe zinnen weg</Txt>
            <Txt variant="small" color={colors.muted}>
              Weggestemd is weg. Die zegt de app nooit meer.
            </Txt>
            {used.length === 0 ? <Txt variant="small">Deze ronde zei de app niks bijzonders.</Txt> : null}
            {used.map((p) => {
              const gone = banned.includes(p.id)
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: gone }}
                  onPress={() => {
                    if (!gone) track('phrase_banned', { id: p.id })
                    setState((st) => ({ banned: gone ? st.banned.filter((b) => b !== p.id) : [...st.banned, p.id] }))
                  }}
                  style={[s.vote, gone && { borderColor: colors.pink }]}>
                  <Txt style={{ flex: 1, textDecorationLine: gone ? 'line-through' : 'none' }} color={gone ? colors.muted : colors.text}>
                    {fill(p.text, { a: 7, b: 8, antwoord: 56, combo: 5, tafel: 7 }).shown}
                  </Txt>
                  <ThumbsDown size={18} color={gone ? colors.pink : colors.muted} />
                </Pressable>
              )
            })}
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setVoting(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Txt variant="small" color={colors.muted} style={{ textDecorationLine: 'underline' }}>
              Zei de app iets cringe? Stem het weg
            </Txt>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ gap: space.s }}>
        {result.challengeCode ? <ReplyButton code={result.challengeCode} score={result.score} seconds={result.seconds} /> : null}
        <Button big label="NOG EEN RONDE" onPress={() => router.replace('/ronde')} />
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button label="Delen" kind="secondary" onPress={() => router.push('/delen')} style={{ flex: 1 }} />
          <Button label="Klaar voor nu" kind="secondary" onPress={() => router.replace('/')} style={{ flex: 1 }} />
        </View>
      </View>
    </Screen>
  )
}

// After playing someone's challenge: send her own score back on the same sums.
function ReplyButton({ code, score, seconds }: { code: string; score: number; seconds: number }) {
  const c = decodeChallenge(code)
  if (!c) return null
  const name = getState().settings.name
  const reply = encodeChallenge({ sums: c.sums, score, seconds, name, reply: true })
  const won = score > c.score || (score === c.score && seconds < c.seconds)
  return (
    <Button
      label={won ? `Je wint van ${c.name || 'haar'}. Stuur je score terug` : 'Stuur je score terug'}
      onPress={() =>
        void Share.share({
          message: `${name.trim() || 'Ik'}: ${score}/10 in ${seconds} sec op jouw sommen. ${challengeUrl(reply)}`,
        })
      }
    />
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[ui.card, { flex: 1, padding: space.m }]}>
      <Txt style={{ fontFamily: fonts.displayBold, fontSize: 20 }}>{value}</Txt>
      <Txt variant="small" color={colors.muted}>
        {label}
      </Txt>
    </View>
  )
}

const s = StyleSheet.create({
  cell: { flex: 1, height: 26, borderRadius: 6 },
  vote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 48,
    paddingHorizontal: space.m,
    borderRadius: radius.s,
    borderWidth: 2,
    borderColor: colors.line,
  },
})
