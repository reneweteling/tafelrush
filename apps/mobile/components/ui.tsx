// Small building blocks shared by the screens.

import type { LucideIcon } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { G, Rect } from 'react-native-svg'

import { colors, fonts, gutter, radius, space } from '@/lib/theme'

type Variant = 'hero' | 'title' | 'heading' | 'body' | 'bodyBold' | 'small' | 'label'

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 52, lineHeight: 50, letterSpacing: -1.5 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.5 },
  heading: { fontFamily: fonts.displayBold, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19 },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
}

export function Txt({
  variant = 'body',
  color = colors.text,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  // A custom fontSize without its own lineHeight would keep the variant's small one and clip the glyphs.
  const flat = StyleSheet.flatten(style)
  const fix = flat?.fontSize && !flat.lineHeight ? { lineHeight: Math.round(flat.fontSize * 1.2) } : null
  return <Text {...rest} style={[variants[variant], { color }, style, fix]} />
}

export function Screen({
  children,
  style,
  background = colors.bg,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  background?: string
}) {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: background, paddingTop: insets.top + space.l, paddingBottom: insets.bottom + space.l },
        style,
      ]}>
      {children}
    </View>
  )
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon: Icon,
  big,
  style,
  disabled,
}: {
  label: string
  onPress: () => void
  kind?: 'primary' | 'secondary' | 'danger'
  icon?: LucideIcon
  big?: boolean
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}) {
  const primary = kind === 'primary'
  const fg = primary ? colors.ink : kind === 'danger' ? colors.pink : colors.text
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        primary ? { backgroundColor: colors.lime } : { borderWidth: 2, borderColor: colors.line },
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}>
      {Icon ? <Icon size={big ? 26 : 20} color={fg} fill={primary && big ? fg : 'transparent'} /> : null}
      <Text
        style={
          big
            ? { fontFamily: fonts.display, fontSize: 24, color: fg, letterSpacing: -0.5 }
            : { fontFamily: fonts.bodyBold, fontSize: 16, color: fg }
        }>
        {label}
      </Text>
    </Pressable>
  )
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Icon size={20} color={colors.text} />
    </Pressable>
  )
}

export function Bubble({ text, from, strong, dashed, color }: { text: string; from: 'app' | 'me'; strong?: boolean; dashed?: boolean; color?: string }) {
  const me = from === 'me'
  return (
    <View
      style={[
        styles.bubble,
        me ? styles.bubbleMe : styles.bubbleApp,
        dashed && { borderStyle: 'dashed', borderColor: color ?? colors.lime },
      ]}>
      <Txt variant={strong ? 'bodyBold' : 'body'} color={strong ? colors.text : colors.muted} style={strong ? { fontSize: 19, lineHeight: 25 } : undefined}>
        {text}
      </Txt>
    </View>
  )
}

export function Chip({ label, background, color = colors.ink }: { label: string; background: string; color?: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Txt variant="bodyBold" color={color} style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </View>
  )
}

/** The × mark: lime with a pink glitch shadow. */
export function Mark({ size = 40, shadow = true }: { size?: number; shadow?: boolean }) {
  const bar = (fill: string, rot: number) => (
    <Rect x={42} y={8} width={16} height={84} rx={8} fill={fill} transform={`rotate(${rot} 50 50)`} />
  )
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      {shadow ? (
        <G transform="translate(5 4)">
          {bar(colors.pink, 45)}
          {bar(colors.pink, -45)}
        </G>
      ) : null}
      {bar(colors.lime, 45)}
      {bar(colors.lime, -45)}
    </Svg>
  )
}

export const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: gutter, gap: space.xl },
  button: {
    minHeight: 52,
    borderRadius: radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s,
    paddingHorizontal: space.l,
  },
  buttonBig: { minHeight: 76, borderRadius: 24 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: { maxWidth: '85%', paddingVertical: 12, paddingHorizontal: 16 },
  bubbleApp: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill },
  card: { backgroundColor: colors.surface, borderRadius: radius.l, padding: space.l },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m },
})
