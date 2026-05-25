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

const COLORS_A = ['#EEEAF8', '#F5EEF8', '#EAF0F8', '#EAF5F2', '#F8F5EA'] as const
const COLORS_B = ['#F8F5EA', '#EAF0F8', '#F8F5EA', '#EEEAF8', '#F5EEF8'] as const

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
    <View style={{ flex: 1, backgroundColor: '#F7F6FC' }}>
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
