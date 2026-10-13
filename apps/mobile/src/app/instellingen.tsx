import { COMPANY, MAKER, MAKER_URL, SITE_URL } from '@tafelrush/shared'
import * as Application from 'expo-application'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { router } from 'expo-router'
import * as StoreReview from 'expo-store-review'
import * as WebBrowser from 'expo-web-browser'
import { Check, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Linking, Pressable, ScrollView, Share, StyleSheet, Switch, TextInput, View } from 'react-native'

import { Button, IconButton, Mark, Screen, styles as ui, Txt } from '@/components/ui'
import { analyticsAvailable, setAnalyticsEnabled, track } from '@/lib/analytics'
import { resetProgress, updateSettings as saveSettings, useStore, type Settings } from '@/lib/store'
import { colors, fonts, radius, space } from '@/lib/theme'
import { downloadDutchModel, onDeviceStatus } from '@/lib/listen'
import { dutchVoices, say, type DutchVoice } from '@/lib/voice'

// Expo Go has its own build number; leave it out there.
const buildNumber =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? null : Application.nativeBuildVersion

/** Saves a setting and counts the change (fixed keys and values only, never the name). */
function updateSettings(patch: Partial<Settings>) {
  saveSettings(patch)
  for (const [key, value] of Object.entries(patch)) {
    if (key !== 'name') track('setting_changed', { key, value: String(value) })
  }
}

function open(url: string) {
  void WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url))
}

export default function Instellingen() {
  const settings = useStore((s) => s.settings)
  const [confirmReset, setConfirmReset] = useState(false)
  const [voices, setVoices] = useState<DutchVoice[]>([])
  const [model, setModel] = useState<'on' | 'missing' | 'unsupported' | 'busy' | 'asked' | 'failed'>('unsupported')
  useEffect(() => {
    void dutchVoices().then(setVoices)
    void onDeviceStatus().then(setModel)
  }, [])
  const activeVoice = settings.voice && voices.some((v) => v.id === settings.voice) ? settings.voice : voices[0]?.id

  return (
    <Screen>
      <View style={ui.row}>
        <IconButton icon={ChevronLeft} label="Terug" onPress={() => router.back()} />
        <Txt variant="title">Instellingen</Txt>
      </View>

      <ScrollView contentContainerStyle={{ gap: space.xxl, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Group title="Bedenktijd">
          <Segments
            value={settings.seconds}
            options={[
              [3, '3 sec'],
              [6, '6 sec'],
              [10, '10 sec'],
              [0, 'Geen'],
            ]}
            onChange={(seconds) => updateSettings({ seconds })}
          />
        </Group>

        <Group title="Toon van de app">
          <Segments
            value={settings.slang}
            options={[
              [true, 'Met jongerentaal'],
              [false, 'Gewoon aardig'],
            ]}
            onChange={(slang) => updateSettings({ slang })}
          />
        </Group>

        <Group title="Stem">
          {voices.length > 1 ? (
            <View style={s.list}>
              {voices.map((v, i) => {
                const on = v.id === activeVoice
                return (
                  <Pressable
                    key={v.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      saveSettings({ voice: v.id })
                      track('setting_changed', { key: 'voice', value: String(i + 1) })
                      void say('Zeven keer acht?', { voice: v.id })
                    }}
                    style={({ pressed }) => [s.row, i < voices.length - 1 && s.rowLine, pressed && { opacity: 0.6 }]}>
                    <Txt style={{ flex: 1 }} variant={on ? 'bodyBold' : 'body'}>
                      {v.label}
                    </Txt>
                    {on ? <Check size={20} color={colors.lime} /> : <Volume2 size={18} color={colors.muted} />}
                  </Pressable>
                )
              })}
            </View>
          ) : null}
          <Segments
            value={settings.rate}
            options={[
              [0.9, 'Rustig'],
              [1.1, 'Normaal'],
              [1.3, 'Snel'],
            ]}
            onChange={(rate) => updateSettings({ rate })}
          />
          <Segments
            value={settings.pitch}
            options={[
              [1.0, 'Laag'],
              [1.2, 'Normaal'],
              [1.4, 'Hoog'],
            ]}
            onChange={(pitch) => updateSettings({ pitch })}
          />
          <Button label="Laat horen" kind="secondary" icon={Volume2} onPress={() => void say('Zeven keer acht? Tuff.')} />
        </Group>

        {model !== 'unsupported' ? (
          <Group title="Spraakherkenning">
            {model === 'on' ? (
              <Txt variant="small" color={colors.muted}>
                Je telefoon verstaat Nederlands zelf, zonder internet. Dat is het snelst.
              </Txt>
            ) : (
              <>
                <Txt variant="small" color={colors.muted}>
                  {model === 'asked'
                    ? 'Android downloadt het Nederlands, soms pas als je telefoon op wifi en aan de lader zit. Kijk later nog eens.'
                    : model === 'failed'
                      ? 'Dat lukte niet. Herkennen blijft via internet gaan.'
                      : 'Sneller herkennen? Zet Nederlands op je telefoon, dan hoeft hij niet via internet.'}
                </Txt>
                {model === 'missing' || model === 'busy' ? (
                  <Button
                    label={model === 'busy' ? 'Even geduld...' : 'Nederlands downloaden'}
                    kind="secondary"
                    disabled={model === 'busy'}
                    onPress={() => {
                      setModel('busy')
                      void downloadDutchModel().then(async (status) => {
                        track('setting_changed', { key: 'dutch_model', value: status })
                        setModel(status === 'done' ? await onDeviceStatus() : status === 'later' ? 'asked' : 'failed')
                      })
                    }}
                  />
                ) : null}
              </>
            )}
          </Group>
        ) : null}

        <Group title="Je naam">
          <TextInput
            value={settings.name}
            onChangeText={(name) => updateSettings({ name: name.slice(0, 14) })}
            placeholder="Voor de deelkaart en uitdagingen"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Je naam"
            autoCapitalize="words"
            style={s.input}
          />
        </Group>

        <View style={s.list}>
          <Toggle label="Geluidseffecten" k="sounds" settings={settings} />
          <Toggle label="Scherm schudt bij fout" k="shake" settings={settings} />
          <Toggle label="Typen in plaats van praten" k="typing" settings={settings} />
          <Toggle label="Na fout eerst nazeggen" k="repeatAfterWrong" settings={settings} last />
        </View>

        <Group title="Over">
          <View style={s.list}>
            <Row label="Deel Tafel Rush met een vriendin" onPress={() => router.push('/uitdagen')} />
            <Row
              label="Geef een beoordeling"
              onPress={() => {
                void StoreReview.hasAction().then((ok) => (ok ? StoreReview.requestReview() : open(SITE_URL)))
              }}
            />
            <Row
              label="Vertel het verder"
              onPress={() => void Share.share({ message: `Tafels oefenen door ze hardop te zeggen: ${SITE_URL}` })}
            />
            {analyticsAvailable ? (
              <View style={[s.row, s.rowLine]}>
                <Txt style={{ flex: 1 }}>Anonieme statistieken delen</Txt>
                <Switch
                  accessibilityLabel="Anonieme statistieken delen"
                  value={settings.analytics === true}
                  onValueChange={setAnalyticsEnabled}
                  trackColor={{ true: colors.lime, false: colors.line }}
                  thumbColor={colors.text}
                />
              </View>
            ) : null}
            <Row label="Privacy" onPress={() => open(`${SITE_URL}/privacy`)} last />
          </View>
          <Txt variant="small" color={colors.muted}>
            Je voortgang blijft op dit toestel. Geen account, geen reclame. Statistieken zijn anoniem en alleen als je dat wilt.
          </Txt>
        </Group>

        <Button
          label={confirmReset ? 'Zeker weten? Tik nog een keer' : 'Voortgang wissen'}
          kind="danger"
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true)
            void resetProgress()
            setConfirmReset(false)
          }}
        />

        <View style={s.footer}>
          <Mark size={40} />
          <Txt style={{ fontFamily: fonts.displayBold, fontSize: 16 }}>Tafel Rush</Txt>
          <Txt variant="small" color={colors.muted}>
            Tafels oefenen, maar dan tuff.
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Txt variant="small" color={colors.muted}>
              Gemaakt door{' '}
            </Txt>
            <Pressable accessibilityRole="link" onPress={() => open(MAKER_URL)} hitSlop={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <Txt variant="small" style={{ textDecorationLine: 'underline' }}>
                {MAKER}
              </Txt>
            </Pressable>
            <Txt variant="small" color={colors.muted}>
              {' '}· {COMPANY}
            </Txt>
          </View>
          <Txt variant="small" color={colors.muted} style={{ fontSize: 12 }}>
            versie {Constants.expoConfig?.version ?? ''}
            {buildNumber ? ` (build ${buildNumber})` : ''}
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Txt variant="bodyBold">{title}</Txt>
      {children}
    </View>
  )
}

function Segments<T extends string | number | boolean>({
  value,
  options,
  onChange,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <Pressable
            key={String(v)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(v)}
            style={[s.segment, on && { backgroundColor: colors.lime, borderColor: colors.lime }]}>
            <Txt variant="bodyBold" color={on ? colors.ink : colors.text} style={{ fontSize: 15, textAlign: 'center' }}>
              {label}
            </Txt>
          </Pressable>
        )
      })}
    </View>
  )
}

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings]

function Toggle({ label, k, settings, last }: { label: string; k: BoolKey; settings: Settings; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowLine]}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <Switch
        accessibilityLabel={label}
        value={settings[k]}
        onValueChange={(v) => updateSettings({ [k]: v } as Partial<Settings>)}
        trackColor={{ true: colors.lime, false: colors.line }}
        thumbColor={colors.text}
      />
    </View>
  )
}

function Row({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { opacity: 0.6 }]}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  )
}

const s = StyleSheet.create({
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.m,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: space.l,
  },
  list: { borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, paddingHorizontal: space.l },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  footer: { alignItems: 'center', gap: 6, paddingTop: space.m },
})
