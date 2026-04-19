import { useEffect } from 'react'
import { DimensionValue, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { radii, shadows } from '@/features/core/theme'

function Bone({ width, height, borderRadius = 10 }: { width: DimensionValue; height: number; borderRadius?: number }) {
  const opacity = useSharedValue(1)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, backgroundColor: 'rgba(15,23,42,0.07)' }, animStyle]} />
    </View>
  )
}

export function SkeletonCampaignCard() {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.5)',
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <Bone width="100%" height={170} borderRadius={0} />
      <View style={{ padding: 18, gap: 12 }}>
        <Bone width="70%" height={22} />
        <Bone width="40%" height={14} />
        <Bone width="55%" height={14} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Bone width={80} height={12} />
          <Bone width={100} height={12} />
        </View>
      </View>
    </View>
  )
}

export function SkeletonDeliverableCard() {
  return (
    <View
      style={{
        borderRadius: 22,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(191,219,254,0.8)',
        padding: 16,
        gap: 12,
        ...shadows.card,
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
