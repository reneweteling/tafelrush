// A week report as a story-sized picture, shared with the phone's own share menu.

import { levelFromXp, rankOf, SITE_URL } from '@tafelrush/shared'
import { router } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { ChevronLeft, Share2 } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Share, StyleSheet, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

import { Button, IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { track } from '@/lib/analytics'
import { useStore } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'

const WEEK = 7 * 24 * 3600 * 1000

function weekNumber(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export default function Delen() {
  const rounds = useStore((s) => s.rounds)
  const progress = useStore((s) => s.progress)
  const xp = useStore((s) => s.xp)
  const name = useStore((s) => s.settings.name)
  const card = useRef<View>(null)
  const [busy, setBusy] = useState(false)
  const [now] = useState(() => Date.now())

  const since = now - WEEK
  const week = rounds.filter((r) => r.at >= since)
  const sums = week.reduce((n, r) => n + r.total, 0)
  const bestCombo = week.reduce((n, r) => Math.max(n, r.bestCombo), 0)
  const avg = sums > 0 ? week.reduce((n, r) => n + r.seconds, 0) / sums : 0
  const best = week.reduce<(typeof week)[number] | null>(
    (b, r) => (!b || r.score > b.score || (r.score === b.score && r.seconds < b.seconds) ? r : b),
    null,
  )
  const gold = Object.values(progress).filter((st) => rankOf(st.level) >= 3).length
  const lvl = levelFromXp(xp).level
  const who = name.trim() || 'Ik'

  async function share() {
    setBusy(true)
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' })
      track('report_shared')
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Deel je week' })
      } else {
        await Share.share({ message: `${who} deed deze week ${sums} sommen in Tafel Rush. ${SITE_URL}` })
      }
    } catch {
      // Cancelled or not possible; nothing to do.
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <View style={ui.row}>
        <IconButton icon={ChevronLeft} label="Terug" onPress={() => router.back()} />
        <Txt variant="title">Jouw week</Txt>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View ref={card} collapsable={false} style={s.card}>
          <View style={s.blob} />
          <Txt style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 1 }} color={colors.ink}>
            TAFEL RUSH · WEEK {weekNumber(new Date())}
          </Txt>
          <Txt style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 32, letterSpacing: -1 }} color={colors.ink}>
            {who === 'Ik' ? 'Ik deed' : `${who} deed`}
            {'\n'}
            {sums} sommen.
          </Txt>
          <Txt variant="bodyBold" color={colors.ink}>
            {sums >= 100 ? 'Lowkey een rekenwonder.' : sums > 0 ? 'En het worden er meer.' : 'Deze week nog niks. Tijd voor een ronde.'}
          </Txt>
          <View style={s.grid}>
            <Tile value={`${gold}`} small="/100" label="goud of beter" />
            <Tile value={`×${bestCombo}`} label="beste combo" />
            <Tile value={`${avg.toFixed(1).replace('.', ',')}s`} label="gem. per som" />
            <Tile value={`Lvl ${lvl}`} label="level" />
          </View>
          {best ? (
            <View style={s.best}>
              <Txt variant="bodyBold" color={colors.ink} style={{ fontSize: 14 }}>
                Beste ronde: {best.score}/{best.total} in {best.seconds} sec.
              </Txt>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' }}>
            <Txt variant="bodyBold" color={colors.ink} style={{ fontSize: 12 }}>
              tafelrush.nl
            </Txt>
            <Txt variant="bodyBold" color={colors.ink} style={{ fontSize: 12 }}>
              Durf jij?
            </Txt>
          </View>
        </View>
      </View>

      <View style={{ gap: space.s }}>
        <Button big label="DELEN" icon={Share2} onPress={() => void share()} disabled={busy} />
        <Button label="Iemand uitdagen" kind="secondary" onPress={() => router.push('/uitdagen')} />
      </View>
    </Screen>
  )
}

function Tile({ value, small, label }: { value: string; small?: string; label: string }) {
  return (
    <View style={s.tile}>
      <Txt style={{ fontFamily: fonts.displayBold, fontSize: 20 }}>
        {value}
        {small ? (
          <Txt variant="small" color={colors.muted} style={{ fontSize: 11 }}>
            {small}
          </Txt>
        ) : null}
      </Txt>
      <Txt variant="small" color={colors.muted} style={{ fontSize: 12 }}>
        {label}
      </Txt>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    width: 290,
    aspectRatio: 9 / 16,
    borderRadius: 26,
    backgroundColor: colors.lime,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.pink,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tile: { width: '47%', flexGrow: 1, padding: 10, borderRadius: 14, backgroundColor: colors.ink },
  best: { padding: 12, borderRadius: radius.s, borderWidth: 2, borderColor: colors.ink },
})
