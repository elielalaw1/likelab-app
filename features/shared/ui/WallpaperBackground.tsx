import { ReactNode, useEffect } from 'react'
import { DimensionValue, StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { BlurView } from 'expo-blur'

type Orb = {
  color: string
  size: number
  top?: DimensionValue
  bottom?: DimensionValue
  left?: DimensionValue
  right?: DimensionValue
  dx: number
  dy: number
  duration: number
  delay: number
}

const ORBS: Orb[] = [
  { color: '#DDD6FE', size: 220, top: -40,  left: -40,  dx: 40, dy: 30, duration: 9000,  delay: 0    },
  { color: '#FCE7F3', size: 190, top: 100,  right: -30, dx: 50, dy: 40, duration: 11000, delay: 1200 },
  { color: '#BFDBFE', size: 240, bottom: 180, left: -50, dx: 35, dy: 45, duration: 13000, delay: 600  },
  { color: '#A7F3D0', size: 180, bottom: 80, right: -25, dx: 40, dy: 35, duration: 10000, delay: 800  },
  { color: '#FEF9C3', size: 200, top: 280,  left: 30,   dx: 30, dy: 50, duration: 12000, delay: 400  },
]

function AnimatedOrb({ orb }: { orb: Orb }) {
  const x = useSharedValue(0)
  const y = useSharedValue(0)

  useEffect(() => {
    x.value = withDelay(
      orb.delay,
      withRepeat(
        withSequence(
          withTiming(orb.dx,  { duration: orb.duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-orb.dx, { duration: orb.duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    )
    y.value = withDelay(
      orb.delay,
      withRepeat(
        withSequence(
          withTiming(-orb.dy, { duration: orb.duration / 3, easing: Easing.inOut(Easing.sin) }),
          withTiming(orb.dy,  { duration: (orb.duration * 2) / 3, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    )
  }, [orb.delay, orb.dx, orb.dy, orb.duration, x, y])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))

  const pos: { top?: DimensionValue; bottom?: DimensionValue; left?: DimensionValue; right?: DimensionValue } = {}
  if (orb.top    !== undefined) pos.top    = orb.top
  if (orb.bottom !== undefined) pos.bottom = orb.bottom
  if (orb.left   !== undefined) pos.left   = orb.left
  if (orb.right  !== undefined) pos.right  = orb.right

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          backgroundColor: orb.color,
          opacity: 0.42,
          ...pos,
        },
        style,
      ]}
    />
  )
}

export function WallpaperBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F6FF' }}>
      {ORBS.map((orb, i) => (
        <AnimatedOrb key={i} orb={orb} />
      ))}
      <BlurView
        pointerEvents="none"
        intensity={55}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
