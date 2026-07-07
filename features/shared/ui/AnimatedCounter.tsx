import { useEffect } from 'react'
import { TextInput } from 'react-native'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

const AnimatedText = Animated.createAnimatedComponent(TextInput)

// Ticks from 0 up to the target when it mounts. Formatting happens INSIDE the
// worklet (no external JS call), so the value spins on the UI thread without a
// per-frame React re-render.
export function AnimatedCounter({
  value,
  delay = 0,
  duration = 1100,
  style,
}: {
  value: number
  delay?: number
  duration?: number
  style: object
}) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = 0
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }))
  }, [value, delay, duration, progress])

  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(interpolate(progress.value, [0, 1], [0, value], Extrapolation.CLAMP))
    let text: string
    if (v >= 1_000_000) {
      text = `${(v / 1_000_000).toFixed(1)}M`
    } else if (v >= 1_000) {
      text = `${(v / 1_000).toFixed(1)}K`
    } else {
      text = `${v}`
    }
    return { text, defaultValue: text } as Partial<{ text: string; defaultValue: string }>
  })

  return (
    <AnimatedText
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={animatedProps as never}
      style={style}
    />
  )
}
