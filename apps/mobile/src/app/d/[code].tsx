// Opened from a challenge link: tafelrush.nl/d/<code> or tafelrush://d/<code>.

import { decodeChallenge, describeTables } from '@tafelrush/shared'
import { router, useLocalSearchParams } from 'expo-router'
import { Play } from 'lucide-react-native'
import { useEffect } from 'react'
import { View } from 'react-native'

import { Button, Mark, Screen, Txt } from '@/components/ui'
import { track } from '@/lib/analytics'
import { setState } from '@/lib/store'
import { colors, fonts, space } from '@/lib/theme'

export default function ChallengeLink() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const c = typeof code === 'string' ? decodeChallenge(code) : null

  useEffect(() => {
    if (!c || typeof code !== 'string') return
    track('challenge_opened', { reply: c.reply })
    setState((st) =>
      st.challenges.some((x) => x.code === code)
        ? {}
        : {
            challenges: [
              ...st.challenges,
              { code, name: c.name, score: c.score, seconds: c.seconds, at: Date.now(), mine: null, reply: c.reply },
            ].slice(-50),
          },
    )
  }, [c, code])

  if (!c) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Txt variant="title">Deze link klopt niet</Txt>
        <Txt color={colors.muted}>Vraag of ze hem nog een keer stuurt.</Txt>
        <Button label="Naar start" onPress={() => router.replace('/')} />
      </Screen>
    )
  }

  const who = c.name || 'Iemand'
  return (
    <Screen style={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: space.l }}>
        <Mark size={72} />
        <Txt variant="label" color={colors.muted}>
          {c.reply ? 'Ze heeft jouw sommen gespeeld' : 'Uitdaging'}
        </Txt>
        <Txt style={{ fontFamily: fonts.display, fontSize: 34, textAlign: 'center', letterSpacing: -1 }}>
          {c.reply ? `${who} deed ${c.score}/10 in ${c.seconds} sec` : `${who} daagt je uit`}
        </Txt>
        {!c.reply ? (
          <Txt variant="bodyBold" color={colors.muted} style={{ textAlign: 'center' }}>
            {c.score}/10 in {c.seconds} sec. Zelfde 10 sommen, {describeTables(c.sums)}.
          </Txt>
        ) : null}
      </View>
      <View style={{ gap: space.s, marginTop: space.xxl }}>
        <Button
          big
          label={c.reply ? 'REVANCHE' : 'SPELEN'}
          icon={Play}
          onPress={() => router.replace({ pathname: '/ronde', params: { code: code! } })}
        />
        <Button label="Later" kind="secondary" onPress={() => router.replace('/')} />
      </View>
    </Screen>
  )
}
