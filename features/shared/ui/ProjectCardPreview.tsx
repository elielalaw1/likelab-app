import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'

// A mini of the new Projects hub card — a campaign as an image-led card with its
// status + the single next step. Shared by the tutorial and What's New so both
// preview the real new page. The CTA breathes to draw the eye.
export function ProjectCardPreview() {
  const v = useSharedValue(0)
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 950, easing: Easing.inOut(Easing.ease) })), -1, false)
    return () => {
      v.value = 0
    }
  }, [v])
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * 0.04 }] }))

  return (
    <View style={{ width: 248, borderRadius: 22, overflow: 'hidden', backgroundColor: redesign.color.ink, ...redesign.shadow.cta }}>
      {/* faux cover */}
      <LinearGradient colors={['#7A3FF2', '#1FC8E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(11,11,15,0.5)', 'rgba(11,11,15,0.93)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />

      <View style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#60A5FA' }} />
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800' }}>Your turn</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 6, paddingRight: 9, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <MaterialCommunityIcons name="clock-outline" size={10} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800' }}>3d left</Text>
          </View>
        </View>

        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 }}>Glow Kit launch</Text>

        <View style={{ gap: 6 }}>
          <View style={{ height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
            <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: '34%', borderRadius: 999 }} />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600' }}>1 of 3 submitted</Text>
        </View>

        <Animated.View style={[{ marginTop: 2, minHeight: 42, borderRadius: 13, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, ctaStyle]}>
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800' }}>Upload video</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={redesign.color.ink} />
        </Animated.View>
      </View>
    </View>
  )
}
