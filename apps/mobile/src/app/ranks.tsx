import { bosses, isBoss, rankOf, RANKS, RANK_COLORS, statsOf } from '@tafelrush/shared'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'

import { IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { useStore } from '@/lib/store'
import { colors, fonts, space } from '@/lib/theme'

const N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function Ranks() {
  const progress = useStore((s) => s.progress)
  let gold = 0
  for (const a of N) for (const b of N) if (rankOf(statsOf(progress, { a, b }).level) >= 3) gold++
  const boss = bosses(progress)

  return (
    <Screen>
      <View style={ui.row}>
        <IconButton icon={ChevronLeft} label="Terug" onPress={() => router.back()} />
        <Txt variant="title">Ranks</Txt>
      </View>

      <ScrollView contentContainerStyle={{ gap: space.xl, paddingBottom: space.l }}>
        <View style={{ flexDirection: 'row', gap: space.m }}>
          <View style={[ui.card, { flex: 1, padding: space.m }]}>
            <Txt style={{ fontFamily: fonts.displayBold, fontSize: 22 }}>
              {gold}
              <Txt variant="small" color={colors.muted}>
                /100
              </Txt>
            </Txt>
            <Txt variant="small" color={colors.muted}>
              minstens goud
            </Txt>
          </View>
          <View style={[ui.card, { flex: 1, padding: space.m }]}>
            <Txt style={{ fontFamily: fonts.displayBold, fontSize: 22 }} color={colors.pink}>
              {boss.length}
            </Txt>
            <Txt variant="small" color={colors.muted}>
              {boss.length === 1 ? 'boss over' : 'bosses over'}
            </Txt>
          </View>
        </View>

        <View style={{ gap: 3 }} accessibilityLabel="Rank per som, van 1 keer 1 tot 10 keer 10">
          <View style={s.row}>
            <Head label="×" />
            {N.map((b) => (
              <Head key={b} label={String(b)} />
            ))}
          </View>
          {N.map((a) => (
            <View key={a} style={s.row}>
              <Head label={String(a)} />
              {N.map((b) => {
                const st = statsOf(progress, { a, b })
                const r = rankOf(st.level)
                return (
                  <View
                    key={b}
                    style={[
                      s.cell,
                      { backgroundColor: RANK_COLORS[r] },
                      isBoss(st) && { borderWidth: 2, borderColor: colors.pink },
                    ]}
                  />
                )
              })}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {RANKS.map((name, i) => (
            <View key={name} style={[ui.row, { gap: 6 }]}>
              <View style={[s.swatch, { backgroundColor: RANK_COLORS[i] }]} />
              <Txt variant="small" color={colors.muted}>
                {name.toLowerCase()}
              </Txt>
            </View>
          ))}
          <View style={[ui.row, { gap: 6 }]}>
            <View style={[s.swatch, { borderWidth: 2, borderColor: colors.pink }]} />
            <Txt variant="small" color={colors.muted}>
              boss
            </Txt>
          </View>
        </View>

        <View style={ui.card}>
          <Txt variant="small" color={colors.muted}>
            Snel goed (binnen 3 seconden) is een rank omhoog. Fout of te laat zakt twee ranks. Lage ranks komen vaker langs.
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  )
}

function Head({ label }: { label: string }) {
  return (
    <View style={s.cellHead}>
      <Txt variant="small" color={colors.muted} style={{ fontSize: 11 }}>
        {label}
      </Txt>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 6 },
  cellHead: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 12, height: 12, borderRadius: 3 },
})
