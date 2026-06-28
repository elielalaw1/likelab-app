import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { typography } from '@/features/core/theme'

// One shared, animated mock of the TikTok-style campaign video grid — used by both
// the What's New modal and the onboarding tutorial so the new video UI is shown the
// exact same way everywhere. The actionable ("Your turn") tile breathes to draw the eye.
function GridTile({ num, label, color, pulsing }: { num: number; label: string; color: string; pulsing?: boolean }) {
  const v = useSharedValue(0)
  useEffect(() => {
    if (!pulsing) return
    v.value = withRepeat(withSequence(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 950, easing: Easing.inOut(Easing.ease) })), -1, false)
    return () => {
      v.value = 0
    }
  }, [pulsing, v])
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * 0.05 }] }))

  return (
    <View style={{ width: 74, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: '#15151F', borderWidth: pulsing ? 1.5 : StyleSheet.hairlineWidth, borderColor: pulsing ? color : 'rgba(255,255,255,0.08)' }}>
      <LinearGradient colors={[`${color}55`, '#15151F']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: 5, left: 5, minWidth: 16, height: 16, borderRadius: 5, paddingHorizontal: 4, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900', fontFamily: typography.fontFamily }}>{num}</Text>
      </View>
      {/* Pill sizes to its content (no right anchor) so the full label always fits */}
      <Animated.View style={[{ position: 'absolute', left: 5, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingLeft: 6, paddingRight: 7, paddingVertical: 3, backgroundColor: color }, pulsing ? pulse : undefined]}>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' }} />
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', fontFamily: typography.fontFamily }} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </View>
  )
}

export function VideoGridPreview() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 158, gap: 10, justifyContent: 'center' }}>
      <GridTile num={1} label="In review" color="#7A3FF2" />
      <GridTile num={2} label="Your turn" color="#2563EB" pulsing />
      <GridTile num={3} label="Live" color="#0EA5E9" />
      <GridTile num={4} label="Post now" color="#0F9F6E" />
    </View>
  )
}
