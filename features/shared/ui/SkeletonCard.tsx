import { useEffect, useState } from 'react'
import { DimensionValue, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { redesign } from '@/features/core/theme'

// A skeleton bone with a light shimmer that sweeps left→right — reads more premium
// than a flat opacity pulse.
export function Bone({ width, height, borderRadius = 10, dark = false }: { width: DimensionValue; height: number; borderRadius?: number; dark?: boolean }) {
  const [w, setW] = useState(0)
  const x = useSharedValue(0)

  useEffect(() => {
    x.value = withRepeat(
      withSequence(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 0 })),
      -1,
      false,
    )
  }, [x])

  const shimmer = useAnimatedStyle(() => ({ transform: [{ translateX: -(w + 90) + x.value * (w + 90) * 2 }] }))

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ width, height, borderRadius, overflow: 'hidden', backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(11,11,15,0.06)' }}
    >
      {w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 90 }, shimmer]}>
          <LinearGradient
            colors={dark ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  )
}

// Matches the dark, image-led campaign cards on the Projects hub so loading → loaded
// doesn't visually jump.
export function SkeletonStudioCard() {
  return (
    <View style={{ borderRadius: 24, height: 188, backgroundColor: '#1A1A22', overflow: 'hidden', justifyContent: 'flex-end', padding: 18, gap: 12, ...redesign.shadow.card }}>
      <Bone width={96} height={24} borderRadius={999} dark />
      <Bone width="68%" height={22} dark />
      <Bone width="100%" height={6} borderRadius={999} dark />
      <Bone width="100%" height={48} borderRadius={14} dark />
    </View>
  )
}

export function SkeletonCampaignCard() {
  return (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: redesign.radius.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        overflow: 'hidden',
        ...redesign.shadow.card,
      }}
    >
      <Bone width="100%" height={148} borderRadius={0} />
      <View style={{ padding: 16, gap: 12 }}>
        <Bone width="72%" height={20} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Bone width="48%" height={56} borderRadius={16} />
          <Bone width="48%" height={56} borderRadius={16} />
        </View>
        <Bone width="55%" height={13} />
        <Bone width="100%" height={50} borderRadius={999} />
      </View>
    </View>
  )
}

export function SkeletonDeliverableCard() {
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: redesign.color.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        padding: 16,
        gap: 12,
        ...redesign.shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Bone width="60%" height={20} />
        <Bone width={72} height={24} borderRadius={12} />
      </View>
      <Bone width="35%" height={13} />
      <Bone width="45%" height={13} />
    </View>
  )
}
