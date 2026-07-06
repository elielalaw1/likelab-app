import { useEffect, useState } from 'react'
import { Image, Modal, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, FadeInDown, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import { designTopLogo } from '@/design/assets'
import * as SecureStore from 'expo-secure-store'

// Shows once per real "pending" episode, persisted PER user (SecureStore) so it
// doesn't re-fire on every cold start. The flag is cleared when the account is
// observed as approved, so a later downgrade (admin re-disapproves) shows it again.
// Mirrors TutorialOverlay's per-user "seen" handling.
const SEEN_PREFIX = 'likelab_welcome_pending_seen_'

// Just the LikeLab logo, gently floating.
function ReviewIllustration() {
  const float = useSharedValue(0)
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [float])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-6, 6]) }] }))
  return (
    <Animated.View style={style}>
      <Image source={designTopLogo} style={{ width: 168, height: 168 }} resizeMode="contain" />
    </Animated.View>
  )
}

export function WelcomePendingOverlay() {
  const { data: profile } = useCreatorProfile()
  const [visible, setVisible] = useState(false)

  const status = (profile?.reviewStatus || '').toLowerCase().trim()
  const userId = profile?.id
  // Only "awaiting" once the creator is past the TikTok gate and actually inside
  // the tabs. Without this the overlay mounts+consumes its once-per-session flag
  // during the brief tabs render that happens BEFORE TikTokGuard redirects a new
  // user to /connect-tiktok — so it never showed when they returned. Gating on
  // tiktokConnected means it fires right after signup → TikTok connection.
  // Only "awaiting" for a GENUINELY pending creator past the TikTok gate. Gating on
  // status === 'pending' (not !== 'approved') keeps the reassuring "you'll be
  // approved" copy away from rejected/unknown accounts.
  const awaiting = !!profile && status === 'pending' && !!profile.tiktokConnected

  // Re-evaluate whenever the status settles/changes. The per-user SEEN flag is
  // cleared on every observed `approved`, so an approved → disapproved round-trip
  // shows the welcome again.
  useEffect(() => {
    if (!userId) return
    const key = `${SEEN_PREFIX}${userId}`

    if (status === 'approved') {
      void SecureStore.deleteItemAsync(key).catch(() => {})
      setVisible(false)
      return
    }

    if (!awaiting) return
    let cancelled = false
    void (async () => {
      const seen = await SecureStore.getItemAsync(key).catch(() => null)
      if (!cancelled && !seen) setVisible(true)
    })()
    return () => { cancelled = true }
  }, [awaiting, status, userId])

  const breathe = useSharedValue(0)
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
  }, [breathe])
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.35 + breathe.value * 0.55, transform: [{ scale: 0.85 + breathe.value * 0.3 }] }))

  const dismiss = () => {
    haptic.selection()
    setVisible(false)
    // Persist so this pending-welcome doesn't re-open on the next cold start.
    if (userId) void SecureStore.setItemAsync(`${SEEN_PREFIX}${userId}`, '1').catch(() => {})
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(99,80,184,0.10)', 'rgba(99,80,184,0.03)', 'transparent']}
          start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.55 }}
          style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380 }}
        />
        <SafeAreaView style={{ flex: 1, paddingHorizontal: 28 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            {/* Animated "creator pass under review" — holographic logo tile */}
            <ReviewIllustration />

            <Animated.View
              entering={FadeInDown.duration(360).delay(40)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,80,184,0.10)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Welcome to LikeLab
              </Text>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.duration(360).delay(80)}
              style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 32, fontWeight: '900', letterSpacing: -1.1, lineHeight: 36, textAlign: 'center' }}
            >
              You&apos;re in. Let&apos;s get you approved.
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
              onPress={dismiss}
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
