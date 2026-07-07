import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { DeviceMotion } from 'expo-sensors'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { interpolate, makeMutable, useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated'

// Apple Wallet-style holographic shimmer: a soft iridescent band that travels
// across the surface as the phone tilts. ONE DeviceMotion subscription is shared
// (refcounted) by every mounted shimmer, feeding two module-level shared values —
// each consumer only reads them on the UI thread.

const tiltRoll = makeMutable(0) // rotation around the long axis (left/right tilt)

let refs = 0
let sub: { remove: () => void } | null = null
function acquireTilt(): () => void {
  refs++
  if (refs === 1) {
    DeviceMotion.setUpdateInterval(50)
    sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation) return
      tiltRoll.value = rotation.gamma ?? 0
    })
  }
  return () => {
    refs--
    if (refs === 0) {
      sub?.remove()
      sub = null
    }
  }
}

export function TiltShimmer({ intensity = 0.22 }: { intensity?: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => acquireTilt(), [])

  // Spring-smoothed so sensor noise never jitters the band.
  const smooth = useDerivedValue(() => withSpring(tiltRoll.value, { damping: 22, stiffness: 90 }))
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(smooth.value), [0.02, 0.12, 0.9], [0, 1, 1], 'clamp'),
    transform: [
      { translateX: interpolate(smooth.value, [-0.7, 0.7], [-width * 0.9, width * 0.9], 'clamp') },
      { rotateZ: '18deg' },
    ],
  }))

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ position: 'absolute', top: -60, bottom: -60, left: '18%', width: '64%' }, style]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            `rgba(124,92,255,${intensity * 0.45})`,
            `rgba(255,255,255,${intensity})`,
            `rgba(31,200,232,${intensity * 0.4})`,
            'rgba(255,255,255,0)',
          ]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  )
}
