import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { redesign, typography } from '@/features/core/theme'
import { useReferral } from '@/features/referral/hooks'
import { buildShareMessage, referralMilestone } from '@/features/referral/logic'
import { ConnectorBadge } from '@/features/referral/ui/ConnectorBadge'

const AnimatedText = Animated.createAnimatedComponent(TextInput)
const INK_CARD = '#141420'

// Count that ticks up to its target on mount (UI-thread, no re-render).
function AnimatedCount({ value, style }: { value: number; style: object }) {
  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = 0
    progress.value = withDelay(180, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [value, progress])
  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(interpolate(progress.value, [0, 1], [0, value], Extrapolation.CLAMP))
    return { text: `${v}`, defaultValue: `${v}` } as Partial<{ text: string; defaultValue: string }>
  })
  return <AnimatedText editable={false} pointerEvents="none" underlineColorAndroid="transparent" animatedProps={animatedProps as never} style={style} />
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: redesign.color.card, borderRadius: 18, paddingVertical: 16, alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}>
      <AnimatedCount value={value} style={{ fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.8, fontVariant: ['tabular-nums'], padding: 0, minWidth: 24, textAlign: 'center' }} />
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
    </View>
  )
}

function MilestoneCard({ joinedCount }: { joinedCount: number }) {
  const m = referralMilestone(joinedCount)
  const fill = useSharedValue(0)
  useEffect(() => {
    fill.value = 0
    fill.value = withDelay(260, withTiming(m.fraction, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [m.fraction, fill])
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(3, fill.value * 100)}%` }))

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(120)} style={{ backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: 0.5, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 12, ...redesign.shadow.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: m.reached ? redesign.color.successBg : 'rgba(124,63,242,0.10)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={m.reached ? 'account-multiple-check' : 'gift-outline'} size={20} color={m.reached ? redesign.color.successText : redesign.color.purple} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>Invite 3 friends</Text>
          {m.reached ? (
            <ConnectorBadge />
          ) : (
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted }}>
              {m.remaining} more to earn the Connector badge
            </Text>
          )}
        </View>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', color: redesign.color.ink, fontVariant: ['tabular-nums'] }}>{m.current}/{m.target}</Text>
      </View>
      <View style={{ height: 9, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, barStyle]}>
          <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </Animated.View>
  )
}

export default function InvitePage() {
  const { width } = useWindowDimensions()
  const { data } = useReferral()
  const [copied, setCopied] = useState(false)
  const [celebrate, setCelebrate] = useState(0) // bump to retrigger confetti
  const reachedRef = useRef(false)

  const code = data?.code ?? '······'

  // Celebrate once when the Connector milestone is first reached.
  useEffect(() => {
    if (!data) return
    const reached = referralMilestone(data.joinedCount).reached
    if (reached && !reachedRef.current) {
      reachedRef.current = true
      setCelebrate((n) => n + 1)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [data])

  const onCopy = useCallback(async () => {
    if (!data?.code) return
    await Clipboard.setStringAsync(data.code)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [data?.code])

  const onShare = useCallback(async () => {
    if (!data?.code) return
    try {
      const result = await Share.share({ message: buildShareMessage(data.code) })
      if (result.action === Share.sharedAction) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setCelebrate((n) => n + 1)
      }
    } catch {
      // user dismissed the share sheet — no-op
    }
  }, [data?.code])

  return (
    <Screen tabAware={false} bgColor={redesign.color.bg}>
      <AppHeader />

      {celebrate > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
          <ConfettiCannon key={celebrate} count={120} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={420} fallSpeed={3000} />
        </View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={redesign.color.muted} />
          <Text style={{ color: redesign.color.muted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(250).delay(60)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>Invite friends</Text>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Share your code and grow the LikeLab creator community.
        </Text>
      </Animated.View>

      {/* Code card — holographic border */}
      <Animated.View entering={FadeInDown.duration(300).delay(80)}>
        <LinearGradient colors={redesign.gradient.holographic} locations={redesign.gradient.holographicLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 1.4, ...redesign.shadow.card }}>
          <View style={{ borderRadius: 22.6, backgroundColor: INK_CARD, padding: 20, gap: 16, alignItems: 'center' }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.6, textTransform: 'uppercase' }}>Your invite code</Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: 6, marginLeft: 6 }}>{code}</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              <Pressable onPress={onCopy} accessibilityRole="button" accessibilityLabel="Copy invite code" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color="#fff" />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: '#fff' }}>{copied ? 'Copied!' : 'Copy'}</Text>
              </Pressable>
              <Pressable onPress={onShare} accessibilityRole="button" accessibilityLabel="Share invite" style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 14, backgroundColor: '#fff' }}>
                <MaterialCommunityIcons name="share-variant" size={16} color={redesign.color.ink} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: redesign.color.ink }}>Share invite</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Status */}
      <Animated.View entering={FadeInDown.duration(300).delay(100)} style={{ flexDirection: 'row', gap: 10 }}>
        <StatCell label="Invited" value={data?.invitedCount ?? 0} />
        <StatCell label="Joined" value={data?.joinedCount ?? 0} />
      </Animated.View>

      {/* Reward hook */}
      <MilestoneCard joinedCount={data?.joinedCount ?? 0} />

      {data && !data.isLive ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <MaterialCommunityIcons name="information-outline" size={14} color={redesign.color.faint} />
          <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: redesign.color.faint, lineHeight: 17 }}>
            Your code is ready to share now — invite tracking activates shortly.
          </Text>
        </View>
      ) : null}
    </Screen>
  )
}
