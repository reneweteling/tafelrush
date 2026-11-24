import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium'
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold'
import { Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded/800ExtraBold'
import { Unbounded_900Black } from '@expo-google-fonts/unbounded/900Black'
import { useFonts } from 'expo-font'
import { Stack, usePathname } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { applyConsent, trackScreen } from '@/lib/analytics'
import { listeningPossible } from '@/lib/listen'
import { initSounds } from '@/lib/sfx'
import { getState, loadState, updateSettings, useStore } from '@/lib/store'
import { colors } from '@/lib/theme'
import { initVoice } from '@/lib/voice'

void SplashScreen.preventAutoHideAsync()
void SystemUI.setBackgroundColorAsync(colors.bg)

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_800ExtraBold,
    Unbounded_900Black,
    DMSans_500Medium,
    DMSans_700Bold,
  })
  const loaded = useStore((s) => s.loaded)

  useEffect(() => {
    void loadState()
    void initVoice()
    void initSounds()
  }, [])

  // On Android and iOS the fonts are built into the app (expo-font plugin), useFonts resolves at once.
  // Waiting for them matters: text measured with a fallback font gets clipped once the real one loads.
  const fontsReady = fontsLoaded || !!fontError
  const ready = fontsReady && loaded
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  useEffect(() => {
    if (!loaded) return
    applyConsent()
    // A browser without speech recognition (Firefox): start on Typen instead of Praten.
    if (getState().settings.input === 'praten' && !listeningPossible()) updateSettings({ input: 'typen' })
  }, [loaded])

  const pathname = usePathname()
  useEffect(() => {
    // Challenge codes stay out of the statistics.
    if (loaded) trackScreen(pathname.startsWith('/d/') ? '/d' : pathname)
  }, [loaded, pathname])

  if (!fontsReady) return null

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={s.column}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}>
          <Stack.Screen name="ronde" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="statistieken" options={{ presentation: 'modal', gestureEnabled: false }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  )
}

const s = StyleSheet.create({
  // In a browser on a wide screen the app stays a phone-sized column in the middle.
  column: Platform.select({
    web: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.bg },
    default: { flex: 1 },
  }),
})
