// Challenge a friend with the exact sums of the last round. The link carries
// everything; a friend without the app lands on tafelrush.nl and the store.

import { challengeUrl, describeTables, encodeChallenge } from '@tafelrush/shared'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { ChevronLeft, Send } from 'lucide-react-native'
import { useState } from 'react'
import { ScrollView, Share, StyleSheet, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { Button, IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { track } from '@/lib/analytics'
import { useStore } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'

export default function Uitdagen() {
  const last = useStore((s) => s.lastRound)
  const name = useStore((s) => s.settings.name)
  const received = useStore((s) => s.challenges)
  const [copied, setCopied] = useState(false)

  const code = last
    ? encodeChallenge({ sums: last.played, score: last.score, seconds: last.seconds, name, reply: false })
    : null
  const url = code ? challengeUrl(code) : null

  return (
    <Screen>
      <View style={ui.row}>
        <IconButton icon={ChevronLeft} label="Terug" onPress={() => router.back()} />
        <Txt variant="title">Daag iemand uit</Txt>
      </View>

      <ScrollView contentContainerStyle={{ gap: space.xl, paddingBottom: space.l }}>
        {last && url ? (
          <>
            <View style={s.challenge}>
              <Txt variant="label" color={colors.ink}>
                Jouw uitdaging
              </Txt>
              <Txt style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -1 }} color={colors.ink}>
                {last.score}/10 in {last.seconds} sec
              </Txt>
              <Txt variant="bodyBold" color={colors.ink}>
                Zelfde 10 sommen, {describeTables(last.played)}. Wie is sneller?
              </Txt>
            </View>

            <View style={[ui.row, { gap: space.l }]}>
              <View style={s.qr}>
                <QRCode value={url} size={112} color={colors.ink} backgroundColor={colors.text} />
              </View>
              <Txt variant="small" color={colors.muted} style={{ flex: 1 }}>
                Zit ze naast je? Laat haar dit scannen. Heeft ze de app nog niet, dan komt ze in de store uit.
              </Txt>
            </View>

            {!name.trim() ? (
              <Txt variant="small" color={colors.muted}>
                Tip: zet je naam in de instellingen, dan weet ze van wie de uitdaging komt.
              </Txt>
            ) : null}

            <View style={{ gap: space.s }}>
              <Button
                big
                label="STUUR UITDAGING"
                icon={Send}
                onPress={() => {
                  track('challenge_sent')
                  void Share.share({
                    message: `${name.trim() || 'Ik'} daag${name.trim() ? 't' : ''} je uit bij Tafel Rush: ${last.score}/10 in ${last.seconds} sec. Kun jij het beter? ${url}`,
                  })
                }}
              />
              <Button
                label={copied ? 'Gekopieerd' : 'Kopieer link'}
                kind="secondary"
                onPress={() => {
                  void Clipboard.setStringAsync(url).then(() => setCopied(true))
                }}
              />
            </View>
          </>
        ) : (
          <View style={[ui.card, { gap: space.m }]}>
            <Txt variant="bodyBold">Speel eerst een ronde</Txt>
            <Txt variant="small" color={colors.muted}>
              Je vriendin krijgt precies dezelfde 10 sommen als jij net had.
            </Txt>
            <Button label="Ronde spelen" onPress={() => router.replace('/ronde')} />
          </View>
        )}

        {received.length > 0 ? (
          <View style={{ gap: space.s }}>
            <Txt variant="label" color={colors.muted}>
              Uitdagingen
            </Txt>
            {received
              .slice()
              .reverse()
              .slice(0, 10)
              .map((c) => {
                const theirs = `${c.name || 'Iemand'} · ${c.score}/10 in ${c.seconds} sec`
                const mine = c.mine
                const won = mine ? mine.score > c.score || (mine.score === c.score && mine.seconds < c.seconds) : null
                return (
                  <View key={c.code + c.at} style={[ui.card, ui.row, { padding: space.m }]}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyBold" style={{ fontSize: 15 }}>
                        {theirs}
                      </Txt>
                      <Txt variant="small" color={won === null ? colors.muted : won ? colors.lime : colors.pink}>
                        {won === null ? 'Nog niet gespeeld' : won ? `Jij wint. ${mine!.score}/10 in ${mine!.seconds} sec.` : 'Zij wint. Voorlopig.'}
                      </Txt>
                    </View>
                    <Button
                      label={mine ? 'Revanche' : 'Spelen'}
                      kind={mine ? 'secondary' : 'primary'}
                      onPress={() => router.push({ pathname: '/ronde', params: { code: c.code } })}
                    />
                  </View>
                )
              })}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const s = StyleSheet.create({
  challenge: { padding: 18, borderRadius: radius.l, backgroundColor: colors.pink, gap: 6 },
  qr: { padding: 10, borderRadius: radius.m, backgroundColor: colors.text },
})
