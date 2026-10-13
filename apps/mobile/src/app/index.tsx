import {
  BASE_TABLES,
  bosses,
  isTable,
  levelFromXp,
  smartTables,
  weakestTable,
} from '@tafelrush/shared'
import { router } from 'expo-router'
import { ChevronRight, Flame, Mic, Play, Plus, Settings as SettingsIcon, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { Button, IconButton, Screen, styles as ui, Txt } from '@/components/ui'
import { analyticsAvailable } from '@/lib/analytics'
import { streak, updateSettings, useStore } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'

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

  const picked = settings.mode === 'slim' ? smartTables(progress) : settings.mode === 'alles' ? BASE_TABLES : settings.tables
  const own = settings.ownTables ?? []
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function toggle(t: number) {
    const cur = settings.mode === 'eigen' ? settings.tables : picked
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t].sort((a, b) => a - b)
    updateSettings({ mode: 'eigen', tables: next.length ? next : [t] })
  }

  function addOwn() {
    const t = Number(draft)
    setDraft('')
    setAdding(false)
    if (!isTable(t)) return
    const cur = settings.mode === 'eigen' ? settings.tables : picked
    updateSettings({
      mode: 'eigen',
      tables: [...new Set([...cur, t])].sort((a, b) => a - b),
      ownTables: t > 10 ? [...new Set([...own, t])].sort((a, b) => a - b) : own,
    })
  }

  function removeOwn(t: number) {
    const rest = settings.tables.filter((x) => x !== t)
    updateSettings({ ownTables: own.filter((x) => x !== t), tables: rest.length ? rest : [7] })
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
            {BASE_TABLES.map((t) => {
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
          <View style={s.own}>
            {own.map((t) => {
              const on = picked.includes(t)
              return (
                <Pressable
                  key={t}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Tafel van ${t}`}
                  accessibilityHint="Lang drukken om weg te halen"
                  onPress={() => toggle(t)}
                  onLongPress={() => removeOwn(t)}
                  style={[s.ownTable, on ? s.tableOn : null]}>
                  <Txt style={{ fontFamily: fonts.displayBold, fontSize: 16 }} color={on ? colors.ink : colors.text}>
                    {t}
                  </Txt>
                  {on ? null : (
                    <Pressable accessibilityLabel={`Tafel van ${t} weghalen`} hitSlop={10} onPress={() => removeOwn(t)}>
                      <X size={14} color={colors.muted} />
                    </Pressable>
                  )}
                </Pressable>
              )
            })}
            {adding ? (
              <View style={[s.ownTable, s.ownInput]}>
                <TextInput
                  autoFocus
                  value={draft}
                  onChangeText={(v) => setDraft(v.replace(/[^0-9]/g, '').slice(0, 4))}
                  onSubmitEditing={addOwn}
                  onBlur={() => (draft ? addOwn() : setAdding(false))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  placeholder="1 t/m 1000"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Eigen tafel, 1 tot en met 1000"
                  style={s.ownField}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Eigen tafel toevoegen"
                onPress={() => setAdding(true)}
                style={({ pressed }) => [s.ownTable, s.ownAdd, pressed && { opacity: 0.7 }]}>
                <Plus size={16} color={colors.muted} />
                <Txt variant="bodyBold" color={colors.muted} style={{ fontSize: 15 }}>
                  Eigen tafel
                </Txt>
              </Pressable>
            )}
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
  own: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ownTable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
  },
  ownAdd: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  ownInput: { borderColor: colors.lime, paddingHorizontal: 12 },
  ownField: { minWidth: 110, color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16, paddingVertical: 8 },
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
