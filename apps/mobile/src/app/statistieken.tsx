// One-time question about anonymous usage statistics (opt-in). Both answers weigh
// the same and can be changed later in the settings.

import { router } from 'expo-router'
import { BarChart3 } from 'lucide-react-native'
import { View } from 'react-native'

import { Button, Screen, Txt } from '@/components/ui'
import { setAnalyticsEnabled } from '@/lib/analytics'
import { colors, space } from '@/lib/theme'

export default function Statistieken() {
  function choose(on: boolean) {
    setAnalyticsEnabled(on)
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: space.l }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <BarChart3 size={28} color={colors.lime} />
        </View>
        <Txt variant="title" style={{ textAlign: 'center' }} accessibilityRole="header">
          Mag de app meekijken?
        </Txt>
        <Txt style={{ textAlign: 'center' }}>
          Anoniem: hoeveel rondes er gespeeld worden, welke sommen lastig zijn en of de spraakherkenning je goed verstaat.
          Zo wordt Tafel Rush beter.
        </Txt>
        <Txt variant="small" color={colors.muted} style={{ textAlign: 'center' }}>
          Nooit je naam en nooit wat je zegt. Geen reclame. Via Google Analytics. Ben je jonger dan 16? Vraag het even aan
          je ouder. Je kunt het later altijd uitzetten in de instellingen.
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: space.s, marginTop: space.xxl }}>
        <Button label="Liever niet" kind="secondary" onPress={() => choose(false)} style={{ flex: 1 }} />
        <Button label="Is goed" kind="secondary" onPress={() => choose(true)} style={{ flex: 1 }} />
      </View>
    </Screen>
  )
}
