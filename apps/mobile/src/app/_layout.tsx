import { DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import { Unbounded_800ExtraBold, Unbounded_900Black } from '@expo-google-fonts/unbounded'
import { useFonts } from 'expo-font'
import { Stack, usePathname } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { applyConsent, trackScreen } from '@/lib/analytics'
import { initSounds } from '@/lib/sfx'
import { loadState, useStore } from '@/lib/store'
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
    if (loaded) applyConsent()
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}>
        <Stack.Screen name="ronde" options={{ gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="statistieken" options={{ presentation: 'modal', gestureEnabled: false }} />
      </Stack>
    </SafeAreaProvider>
  )
}
