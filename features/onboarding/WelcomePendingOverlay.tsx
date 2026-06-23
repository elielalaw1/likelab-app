import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'

// Shows once per "awaiting" episode. Reset when the account is observed as approved
// so a later downgrade (e.g. admin re-disapproves while testing) shows it again.
let sessionShown = false

export function WelcomePendingOverlay() {
  const { data: profile } = useCreatorProfile()
  const [visible, setVisible] = useState(false)

  const status = (profile?.reviewStatus || '').toLowerCase().trim()
  // Show for any account that isn't approved yet (pending / removed / rejected / unknown).
  const awaiting = !!profile && status !== 'approved'

  // Re-evaluate whenever the status settles/changes (not just on first load) so a
  // stale "approved" that later refetches to "pending" still triggers the welcome.
  useEffect(() => {
    if (awaiting && !sessionShown) {
      sessionShown = true
      setVisible(true)
    }
    if (status === 'approved') {
      sessionShown = false // re-arm so a future downgrade re-triggers the welcome
      setVisible(false)
    }
  }, [awaiting, status])

  const breathe = useSharedValue(0)
  const spin = useSharedValue(0)
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false)
  }, [breathe, spin])

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.05 }] }))
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }))
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.35 + breathe.value * 0.55, transform: [{ scale: 0.85 + breathe.value * 0.3 }] }))

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(124,63,242,0.12)', 'rgba(31,200,232,0.06)', 'transparent']}
          start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.55 }}
          style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380 }}
        />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 28 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            {/* Animated "under review" orb — rotating holographic ring + breathing core */}
            <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, overflow: 'hidden' }}>
                <Animated.View style={[ringStyle, { width: 220, height: 220, position: 'absolute', top: -35, left: -35 }]}>
                  <LinearGradient
                    colors={redesign.gradient.holographic}
                    locations={redesign.gradient.holographicLocations}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              </View>
              <Animated.View style={[orbStyle, { width: 120, height: 120, borderRadius: 60, backgroundColor: redesign.color.bg, alignItems: 'center', justifyContent: 'center', ...redesign.shadow.card }]}>
                <MaterialCommunityIcons name="timer-sand" size={50} color={redesign.color.purple} />
              </Animated.View>
            </View>

            <Animated.Text
              entering={FadeInDown.duration(360).delay(80)}
              style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' }}
            >
              Thanks for choosing LikeLab 🎉
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.duration(360).delay(160)}
              style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '500', lineHeight: 23, textAlign: 'center', maxWidth: 330 }}
            >
              Your account is being reviewed by our team. As soon as you’re approved, we’ll start working together — campaigns, collabs and getting you paid.
            </Animated.Text>

            <Animated.View
              entering={FadeInDown.duration(360).delay(240)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: redesign.color.warningBg, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}
            >
              <Animated.View style={[dotStyle, { width: 8, height: 8, borderRadius: 4, backgroundColor: redesign.color.warningText }]} />
              <Text style={{ color: redesign.color.warningText, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3 }}>
                Awaiting approval
              </Text>
            </Animated.View>
          </View>

          <View style={{ paddingBottom: 24 }}>
            <Pressable
              onPress={() => { haptic.selection(); setVisible(false) }}
              style={{ minHeight: 54, borderRadius: 999, backgroundColor: redesign.color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...redesign.shadow.cta }}
            >
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>Got it</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}
