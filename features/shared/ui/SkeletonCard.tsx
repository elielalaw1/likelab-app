import { useEffect } from 'react'
import { DimensionValue, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { redesign } from '@/features/core/theme'

function Bone({ width, height, borderRadius = 10 }: { width: DimensionValue; height: number; borderRadius?: number }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 750 }), withTiming(1, { duration: 750 })),
      -1,
      false
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(11,11,15,0.06)' }, animStyle]} />
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
