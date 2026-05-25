import { ReactNode, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

const COLORS_A = ['#EDE8FF', '#FCE8F8', '#DBEAFE', '#D1FAE5', '#FEF9C3', '#FFE4E6'] as const
const COLORS_B = ['#FFE4E6', '#DBEAFE', '#FEF9C3', '#EDE8FF', '#FCE8F8', '#D1FAE5'] as const

export function WallpaperBackground({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [progress])

  const styleA = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))
  const styleB = useAnimatedStyle(() => ({ opacity: progress.value }))

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styleA]}>
        <LinearGradient
          colors={COLORS_A as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styleB]}>
        <LinearGradient
          colors={COLORS_B as unknown as readonly [string, string, ...string[]]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
