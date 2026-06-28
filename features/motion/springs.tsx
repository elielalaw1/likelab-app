import { useEffect, useRef } from 'react'
import { TextInput, TextProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

export const springs = {
  snappy:   { damping: 20, stiffness: 400, mass: 0.6 },
  balanced: { damping: 18, stiffness: 300, mass: 0.7 },
  smooth:   { damping: 22, stiffness: 200, mass: 0.8 },
  bouncy:   { damping: 12, stiffness: 280, mass: 0.65 },
} as const

export const timings = {
  instant: 100,
  fast:    200,
  normal:  350,
  slow:    600,
} as const

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

export function useCountUp(target: number, duration: number = timings.slow) {
  const value = useSharedValue(0)
  useEffect(() => {
    value.value = 0
    value.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) })
  }, [target, duration, value])
  const display = useDerivedValue(() => Math.round(value.value).toString())
  return useAnimatedProps(() => ({ text: display.value } as Partial<TextProps>))
}

type CountUpProps = {
  value: number
  duration?: number
  style?: TextProps['style']
  prefix?: string
  suffix?: string
}

export function CountUp({ value, duration = timings.slow, style, prefix = '', suffix = '' }: CountUpProps) {
  const shared = useSharedValue(0)
  const mounted = useRef(false)
  useEffect(() => {
    // First mount counts up from 0; afterwards animate the delta from the current
    // value instead of snapping back to 0 (which flickered live stats to zero on
    // every refresh).
    if (!mounted.current) {
      mounted.current = true
      shared.value = 0
    }
    shared.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) })
  }, [value, duration, shared])
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(shared.value)}${suffix}`,
    defaultValue: `${prefix}${Math.round(shared.value)}${suffix}`,
  })) as never
  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={`${prefix}${value}${suffix}`}
      style={style as never}
      animatedProps={animatedProps}
      pointerEvents="none"
      underlineColorAndroid="transparent"
    />
  )
}
