import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react'
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

// ─────────────────────────────────────────────────────────────────────────────
// LikeLab motion kit — small, reusable animation primitives so any screen or modal
// gets the same premium reveal/spring feel without re-implementing it. Everything
// runs on the UI thread (Reanimated) and only animates transform/opacity.
// ─────────────────────────────────────────────────────────────────────────────

const SPRING = { damping: 16, stiffness: 130, mass: 0.9 }

// One 0→1 spring driver that fires when `active` becomes true (and resets otherwise).
// Feed it into <Reveal/> to stagger a group off a single value.
export function useReveal(active = true): SharedValue<number> {
  const p = useSharedValue(0)
  useEffect(() => {
    if (active) {
      p.value = 0
      p.value = withSpring(1, SPRING)
    } else {
      p.value = 0
    }
  }, [active, p])
  return p
}

// Low-level: reveals one element, offset by `index`, off a shared driver `p`.
export function Reveal({ p, index = 0, step = 0.16, style, children }: {
  p: SharedValue<number>
  index?: number
  step?: number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}) {
  const s = useAnimatedStyle(() => {
    const start = index * step
    const local = Math.max(0, Math.min(1, (p.value - start) / 0.5))
    return { opacity: local, transform: [{ translateY: (1 - local) * 18 }, { scale: 0.96 + local * 0.04 }] }
  })
  return <Animated.View style={[style, s]}>{children}</Animated.View>
}

// High-level: wrap a group of children — each unmasks a beat after the previous.
// Reveals on mount by default, or re-fires whenever `active` flips true.
export function StaggerReveal({ children, active = true, step = 0.16, style, itemStyle }: {
  children: ReactNode
  active?: boolean
  step?: number
  style?: StyleProp<ViewStyle>
  itemStyle?: StyleProp<ViewStyle>
}) {
  const p = useReveal(active)
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <View style={style}>
      {items.map((child, i) => (
        <Reveal key={i} p={p} index={i} step={step} style={itemStyle}>
          {child}
        </Reveal>
      ))}
    </View>
  )
}

// Spring-pop entrance for a single element (scale + fade), optionally delayed.
export function SpringIn({ children, style, delay = 0 }: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  delay?: number
}) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 160, mass: 0.9 }))
  }, [p, delay])
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.9 + p.value * 0.1 }] }))
  return <Animated.View style={[style, s]}>{children}</Animated.View>
}

// Animated integer that counts up to `value`. Uses tabular figures so it never jitters.
export function CountUp({ value, style, duration = 900, active = true, suffix = '', prefix = '' }: {
  value: number
  style?: StyleProp<TextStyle>
  duration?: number
  active?: boolean
  suffix?: string
  prefix?: string
}) {
  const [display, setDisplay] = useState(0)
  const v = useSharedValue(0)
  useEffect(() => {
    if (!active) { setDisplay(value); return }
    v.value = 0
    v.value = withTiming(value, { duration })
  }, [value, active, duration, v])
  useAnimatedReaction(
    () => v.value,
    (cur) => runOnJS(setDisplay)(Math.round(cur)),
  )
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{prefix}{display}{suffix}</Text>
}

// Spring-filling progress bar. `progress` is 0..1.
export function AnimatedBar({ progress, height = 8, color, track, active = true, radius = 999 }: {
  progress: number
  height?: number
  color: string
  track: string
  active?: boolean
  radius?: number
}) {
  const w = useSharedValue(0)
  useEffect(() => {
    if (!active) { w.value = progress; return }
    w.value = 0
    w.value = withSpring(progress, { damping: 15, stiffness: 110, mass: 0.9 })
  }, [progress, active, w])
  const s = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, w.value)) * 100}%` }))
  return (
    <View style={{ height, borderRadius: radius, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: radius, backgroundColor: color }, s]} />
    </View>
  )
}
