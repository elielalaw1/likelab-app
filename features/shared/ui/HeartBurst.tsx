import { useEffect, useMemo } from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

// LikeLab's own celebration: a burst of holographic hearts (the brand mark)
// launched upward with spread, falling under gravity while spinning and fading.
// Pure Reanimated transforms — no Skia dependency, no layout-prop animation.
// Each heart precomputes its trajectory at mount and plays it on the UI thread.

const heartImg = require('@/assets/images/likelablogonew.png')

type HeartConfig = {
  angle: number
  velocity: number
  spin: number
  size: number
  delay: number
  duration: number
}

function Heart({ cfg, originX, originY }: { cfg: HeartConfig; originX: number; originY: number }) {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withDelay(cfg.delay, withTiming(1, { duration: cfg.duration, easing: Easing.linear }))
  }, [p, cfg])

  const style = useAnimatedStyle(() => {
    const t = p.value * (cfg.duration / 1000)
    const x = Math.cos(cfg.angle) * cfg.velocity * t
    const y = Math.sin(cfg.angle) * cfg.velocity * t + 0.5 * 620 * t * t // gravity
    return {
      opacity: p.value < 0.7 ? 1 : (1 - p.value) / 0.3,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${cfg.spin * p.value}deg` },
        { scale: 0.6 + Math.min(p.value * 5, 1) * 0.4 },
      ],
    }
  })

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: originX - cfg.size / 2, top: originY - cfg.size / 2 }, style]}>
      <Image source={heartImg} style={{ width: cfg.size, height: cfg.size }} resizeMode="contain" />
    </Animated.View>
  )
}

export function HeartBurst({ count = 22, origin }: { count?: number; origin?: { x: number; y: number } }) {
  const { width, height } = useWindowDimensions()
  const ox = origin?.x ?? width / 2
  const oy = origin?.y ?? height * 0.32
  const configs = useMemo<HeartConfig[]>(
    () =>
      Array.from({ length: count }, () => ({
        // Launch upward in a wide fan; gravity brings them back down.
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.9,
        velocity: 300 + Math.random() * 340,
        spin: (Math.random() - 0.5) * 640,
        size: 16 + Math.random() * 18,
        delay: Math.random() * 140,
        duration: 1500 + Math.random() * 500,
      })),
    [count]
  )
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {configs.map((cfg, i) => (
        <Heart key={i} cfg={cfg} originX={ox} originY={oy} />
      ))}
    </View>
  )
}
