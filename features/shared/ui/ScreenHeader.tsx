import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'

const FONT = typography.fontFamily

type Props = {
  /** Microscopic tracked-caps pill above the title — the one place caps read premium. */
  eyebrow?: string
  /** Show a small purple dot inside the eyebrow pill (e.g. a "live" indicator). */
  eyebrowDot?: boolean
  title: string
  subtitle?: string
  /** Custom meta row rendered below the title (takes precedence over subtitle). */
  children?: ReactNode
}

// The shared page header — a big, confident display title with an optional eyebrow
// pill. Gives every tab the same editorial top so the app reads as one premium
// product rather than a set of screens.
export function ScreenHeader({ eyebrow, eyebrowDot, title, subtitle, children }: Props) {
  return (
    <Animated.View entering={FadeInDown.duration(250)} style={{ marginBottom: 6 }}>
      {eyebrow ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          {eyebrowDot ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: redesign.color.ink }} /> : null}
          <Text style={{ color: redesign.color.faint, fontFamily: FONT, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', fontVariant: ['tabular-nums'] }}>
            {eyebrow}
          </Text>
        </View>
      ) : null}
      <Text style={{ fontSize: 40, fontWeight: '900', color: redesign.color.ink, fontFamily: FONT, letterSpacing: -1.8, lineHeight: 42 }}>
        {title}
      </Text>
      {children ? (
        <View style={{ marginTop: 8 }}>{children}</View>
      ) : subtitle ? (
        <Text style={{ fontSize: 15, fontWeight: '500', color: redesign.color.muted, fontFamily: FONT, lineHeight: 22, marginTop: 7 }}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  )
}
