import {
  bosses,
  levelFromXp,
  smartTables,
  weakestTable,
} from '@tafelrush/shared'
import { router } from 'expo-router'
import { ChevronRight, Flame, Mic, Play, Settings as SettingsIcon } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { Button, IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { analyticsAvailable } from '@/lib/analytics'
import { streak, updateSettings, useStore } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'

const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function Start() {
  const settings = useStore((s) => s.settings)
  const progress = useStore((s) => s.progress)
  const xp = useStore((s) => s.xp)
  const days = useStore((s) => s.days)
  const rounds = useStore((s) => s.rounds)

  // Ask once about usage statistics, after the first round so the app first shows what it is.
  const asked = settings.analytics !== null
  useEffect(() => {
    if (!asked && analyticsAvailable && rounds.length > 0) router.push('/statistieken')
  }, [asked, rounds.length])

  const lvl = levelFromXp(xp)
  const days_ = streak(days)
  const boss = bosses(progress)
  const weak = weakestTable(progress)
  const bossTable = weak ?? (boss[0] ? boss[0].a : null)
  const bossInTable = bossTable ? boss.filter((s) => s.a === bossTable || s.b === bossTable) : []
  const best = rounds.reduce<{ score: number; seconds: number } | null>((b, r) => {
    if (r.total !== 10) return b
    if (!b || r.score > b.score || (r.score === b.score && r.seconds < b.seconds)) return { score: r.score, seconds: r.seconds }
    return b
  }, null)

  const picked = settings.mode === 'slim' ? smartTables(progress) : settings.mode === 'alles' ? ALL : settings.tables

  function toggle(t: number) {
    const cur = settings.mode === 'eigen' ? settings.tables : picked
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort((a, b) => a - b)
    updateSettings({ mode: 'eigen', tables: next.length ? next : [t] })
  }

  return (
    <Screen>
      <View style={ui.row}>
        <View style={s.level}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 16 }} color={colors.ink}>
            {lvl.level}
          </Txt>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt variant="small" color={colors.muted}>
              Level {lvl.level}
            </Txt>
            <Txt variant="small" color={colors.muted}>
              {lvl.into} / {lvl.need} XP
            </Txt>
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${Math.round((lvl.into / lvl.need) * 100)}%` }]} />
          </View>
        </View>
        {days_ > 0 ? (
          <View style={[ui.row, { gap: 4 }]} accessibilityLabel={`${days_} dagen op rij`}>
            <Flame size={20} color={colors.orange} fill={colors.orange} />
            <Txt variant="bodyBold" color={colors.orange}>
              {days_}
            </Txt>
          </View>
        ) : null}
        <IconButton icon={SettingsIcon} label="Instellingen" onPress={() => router.push('/instellingen')} />
      </View>

      <ScrollView contentContainerStyle={{ gap: space.xl, paddingBottom: space.l }} showsVerticalScrollIndicator={false}>
        <View>
          <Txt variant="hero">TAFEL</Txt>
          <Txt variant="hero" color={colors.lime}>
            RUSH
          </Txt>
          <Txt variant="body" color={colors.muted} style={{ marginTop: 10 }}>
            {best ? `Record: ${best.score}/10 in ${best.seconds} sec.` : 'Nog geen record. Tijd om er een neer te zetten.'}
          </Txt>
        </View>

        {bossTable && bossInTable.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/ranks')}
            style={({ pressed }) => [s.bossCard, pressed && { opacity: 0.7 }]}>
            <View style={s.bossBadge}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 22 }} color={colors.ink}>
                {bossTable}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="bodyBold">
                {bossInTable.length} {bossInTable.length === 1 ? 'boss' : 'bosses'} in de tafel van {bossTable}
              </Txt>
              <Txt variant="small" color={colors.muted}>
                {bossInTable
                  .slice(0, 3)
                  .map((b) => `${b.a}×${b.b}`)
                  .join(', ')}
                . Dubbel XP.
              </Txt>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        <View style={{ gap: 10 }}>
          <Txt variant="label" color={colors.muted}>
            Tafels
          </Txt>
          <View style={s.grid}>
            {ALL.map((t) => {
              const on = picked.includes(t)
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Tafel van ${t}`}
                  onPress={() => toggle(t)}
                  style={[s.table, on ? s.tableOn : null]}>
                  <Txt style={{ fontFamily: fonts.displayBold, fontSize: 18 }} color={on ? colors.ink : colors.text}>
                    {t}
                  </Txt>
                </Pressable>
              )
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Pill label="Slimme mix" on={settings.mode === 'slim'} onPress={() => updateSettings({ mode: 'slim' })} />
            <Pill label="Alles" on={settings.mode === 'alles'} onPress={() => updateSettings({ mode: 'alles' })} />
          </View>
        </View>
      </ScrollView>

      <View style={{ gap: space.m }}>
        <View style={ui.row}>
          <Mic size={22} color={colors.muted} />
          <Txt variant="small" color={colors.muted} style={{ flex: 1 }}>
            {settings.typing
              ? 'Je typt je antwoorden. Praten zet je aan in de instellingen.'
              : 'Na het starten hoef je niks meer aan te tikken. Gewoon antwoorden.'}
          </Txt>
        </View>
        <Button big label="SPELEN" icon={Play} onPress={() => router.push('/ronde')} />
      </View>
    </Screen>
  )
}

function Pill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[s.pill, on ? s.pillOn : null]}>
      <Txt variant="bodyBold" color={on ? colors.ink : colors.text} style={{ fontSize: 15 }}>
        {label}
      </Txt>
    </Pressable>
  )
}

const s = StyleSheet.create({
  level: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.lime },
  bossCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: space.l,
    borderRadius: radius.l,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.pink,
  },
  bossBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  table: {
    width: '18%',
    flexGrow: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableOn: { backgroundColor: colors.text, borderColor: colors.text },
  pill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: colors.text, borderColor: colors.text },
})
