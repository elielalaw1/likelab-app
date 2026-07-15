import { Image as ExpoImage } from 'expo-image'
import { ActivityIndicator, Pressable, StyleSheet, Text, Vibration, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import * as Haptics from 'expo-haptics'
import { useAudioPlayer } from 'expo-audio'
import { Campaign } from '@/features/core/types'
import { useEffect, useRef, useState } from 'react'
import { formatRewardType, getDaysLeft, isCampaignClosed } from '@/features/core/format'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { BrandSheet } from '@/features/shared/ui/BrandSheet'
import { useTheme } from '@/features/core/useTheme'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { PressableScale } from '@/features/shared/ui/PressableScale'
import { TierBorder, TierCoin, campaignVisualTier } from '@/features/shared/ui/TierBorder'
import Animated, {
  FadeInDown,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

// Same hold-to-apply interaction as the campaign-detail page's main CTA
// (HoldToApplyButton) — applying is a deliberate, weighty action, and this quick-apply
// pill is the OTHER entry point to the exact same action, so it gets the same charge/
// haptic treatment instead of a bare tap. Reimplemented inline (rather than reusing
// HoldToApplyButton directly) because this pill already owns its own idle/pending/
// applied/blocked visual states and shimmer — the hold gesture is layered on top of
// that existing state machine rather than replacing it.
const HOLD_MS = 1800
const SALVO_INTERVAL_MS = 32
const CONTINUOUS_PATTERN = [0, 1]
const chime = require('@/assets/sounds/apply-chime.wav')

type Props = {
  campaign: Campaign
  onPress?: () => void
  onApply?: () => boolean | void | Promise<boolean | void>
  badge?: number
  compact?: boolean
  index?: number
  /** When set, the apply pill shows this gate reason (e.g. "Awaiting approval") up front instead of a baiting "Apply now". */
  applyGate?: string | null
}

function formatPlatform(platform?: string | null) {
  if (!platform) return 'TikTok'
  return platform.replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

// Soft breathing dot for imminent deadlines (last day / tomorrow) — real urgency,
// animated only while such a card is mounted.
function PulseDot() {
  const p = useSharedValue(0)
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true)
    return () => cancelAnimation(p)
  }, [p])
  const st = useAnimatedStyle(() => ({ opacity: 0.35 + p.value * 0.65, transform: [{ scale: 0.8 + p.value * 0.35 }] }))
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#E5484D' }, st]} />
}

function isExpired(campaign: Campaign): boolean {
  return isCampaignClosed(campaign.endDate)
}

function canApply(campaign: Campaign): boolean {
  return !campaign.creatorApplicationStatus && !campaign.invitationStatus && !isExpired(campaign)
}

function brandVerified(campaign: Campaign): boolean {
  return !!(campaign.brandInstagram && campaign.brandTiktok)
}

export function CampaignCard({ campaign, onPress, onApply, badge, compact, index = 0, applyGate }: Props) {
  'use no memo'
  const { palette } = useTheme()
  const brandSheetRef = useRef<BottomSheetModal>(null)
  const [applyState, setApplyState] = useState<'idle' | 'pending' | 'applied' | 'blocked'>('idle')
  const applyingRef = useRef(false)
  const days = getDaysLeft(campaign.endDate)
  const closed = isExpired(campaign)
  const showApply = canApply(campaign) && !!onApply
  const hasSocials = !!(campaign.brandInstagram || campaign.brandTiktok)
  const hasUrgentDeliverables = !!badge && badge > 0

  const shimmer = useSharedValue(0)
  const [btnWidth, setBtnWidth] = useState(0)

  // Hold-to-apply charge state, layered on top of the pill's existing idle/pending/
  // applied/blocked visuals.
  const chargeProgress = useSharedValue(0)
  const pop = useSharedValue(1)
  const chimePlayer = useAudioPlayer(chime)
  const salvoCountRef = useRef(0)
  const salvoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdCompletedRef = useRef(false)

  const stopSalvos = () => {
    Vibration.cancel()
    if (salvoTimerRef.current) {
      clearInterval(salvoTimerRef.current)
      salvoTimerRef.current = null
    }
  }

  const salvo = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    salvoCountRef.current++
    if (salvoCountRef.current % 5 === 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }

  useEffect(() => () => {
    cancelAnimation(chargeProgress)
    stopSalvos()
  }, [chargeProgress])

  const finishHold = () => {
    if (holdCompletedRef.current) return
    holdCompletedRef.current = true
    stopSalvos()
    Vibration.vibrate(400)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    try {
      chimePlayer.seekTo(0)
      chimePlayer.play()
    } catch {
      // Audio is garnish — never let it break the apply flow.
    }
    pop.value = withSequence(
      withTiming(0.93, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(1.07, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 14, stiffness: 220 })
    )
    handleApply()
    chargeProgress.value = withDelay(500, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }))
    setTimeout(() => { holdCompletedRef.current = false }, 1000)
  }

  const startHold = () => {
    if (holdCompletedRef.current || applyState !== 'idle') return
    stopSalvos()
    Vibration.vibrate(CONTINUOUS_PATTERN, true)
    salvo()
    salvoTimerRef.current = setInterval(salvo, SALVO_INTERVAL_MS)
    chargeProgress.value = withTiming(
      1,
      { duration: HOLD_MS * (1 - chargeProgress.value), easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(finishHold)()
      }
    )
  }

  const cancelHold = () => {
    stopSalvos()
    if (holdCompletedRef.current) return
    cancelAnimation(chargeProgress)
    chargeProgress.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) })
  }

  const chargeFillStyle = useAnimatedStyle(() => ({ width: btnWidth * chargeProgress.value }))
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))

  useEffect(() => {
    // Only animate while the Apply pill is actually shown — the card otherwise
    // ran a perpetual UI-thread loop on every mounted row. Default reduceMotion
    // (System) honors the OS "Reduce Motion" setting.
    if (!showApply) return
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      false,
    )
    return () => {
      cancelAnimation(shimmer)
      shimmer.value = 0
    }
  }, [shimmer, showApply])

  const shimmerStyle = useAnimatedStyle(() => {
    const distance = btnWidth + 120
    return {
      transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-120, distance]) }],
    }
  })

  async function handleApply() {
    if (!onApply) return
    // Guard against rapid double-taps firing onApply() more than once.
    if (applyingRef.current || applyState !== 'idle') return
    applyingRef.current = true
    haptic.medium()
    const result = onApply()
    if (result === false) {
      haptic.warning()
      setApplyState('blocked')
      setTimeout(() => { setApplyState('idle'); applyingRef.current = false }, 2500)
      return
    }
    // Async callers (Discover quick-apply) return a promise that resolves false
    // on failure — only show "Applied!" once the round-trip actually succeeds.
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setApplyState('pending')
      try {
        const ok = await result
        if (ok === false) {
          haptic.warning()
          setApplyState('idle')
          applyingRef.current = false
          return
        }
      } catch {
        haptic.warning()
        setApplyState('idle')
        applyingRef.current = false
        return
      }
    }
    haptic.success()
    setApplyState('applied')
    setTimeout(() => { setApplyState('idle'); applyingRef.current = false }, 2500)
  }


  const reward = formatRewardType(campaign)
  const open = canApply(campaign) && !campaign.invitationStatus
  const inviteOnly = !!campaign.invitationStatus
  const verified = brandVerified(campaign)

  // Glass brand chip overlaid on the cover (top-left).
  const brandChip = (
    <Pressable
      onPress={(e) => { e.stopPropagation?.(); if (hasSocials) brandSheetRef.current?.present() }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.82)',
        borderRadius: 999,
        paddingLeft: 4,
        paddingRight: 10,
        paddingVertical: 4,
      }}
    >
      <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={compact ? 16 : 20} />
      <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: compact ? 11 : 12, fontWeight: '700', maxWidth: 130 }} numberOfLines={1}>
        {campaign.brandName || 'Brand'}
      </Text>
      {verified ? <MaterialCommunityIcons name="check-decagram" size={13} color={redesign.color.purple} /> : null}
    </Pressable>
  )

  const tiered2 = campaignVisualTier(campaign)

  const content = compact ? (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: redesign.radius.cardSm,
        borderWidth: tiered2 ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: tiered2 === 'gold' ? 'rgba(212,165,55,0.75)' : tiered2 === 'partner' ? 'rgba(124,92,255,0.65)' : redesign.color.hairlineStrong,
        overflow: 'hidden',
        ...redesign.shadow.card,
      }}
    >
      <View style={{ height: 96, backgroundColor: palette.neutralBg }}>
        {campaign.coverImageUrl ? (
          <ExpoImage
            source={{ uri: campaign.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bullhorn-outline" size={24} color={palette.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.30)']}
          start={{ x: 0.5, y: 0.45 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View style={{ position: 'absolute', left: 8, top: 8 }}>{brandChip}</View>
        {tiered2 ? (
          <View style={{ position: 'absolute', right: 8, bottom: 8 }}>
            <TierCoin tier={tiered2} size={22} />
          </View>
        ) : null}
        {badge ? (
          <View style={{ position: 'absolute', right: 8, top: 8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: 'System' }}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 12, gap: 6 }}>
        {/* Fixed two-line title box so grid rows stay level regardless of title length */}
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, lineHeight: 18, minHeight: 36, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }} numberOfLines={2}>
          {campaign.title}
        </Text>
        <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '500' }} numberOfLines={1}>
          {[reward || null, formatPlatform(campaign.platforms?.[0]), closed ? 'Closed' : days == null ? null : days === 0 ? 'Last day' : `${days}d left`].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
    </View>
  ) : (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: redesign.radius.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: hasUrgentDeliverables ? '#EF4444' : redesign.color.hairlineStrong,
        overflow: 'hidden',
        ...redesign.shadow.card,
      }}
    >
      {/* Cover */}
      <View style={{ height: 148, backgroundColor: palette.neutralBg }}>
        {campaign.coverImageUrl ? (
          <ExpoImage
            source={{ uri: campaign.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="bullhorn-outline" size={36} color={palette.textMuted} />
          </View>
        )}
        {/* Top scrim for legibility */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.30)']}
          start={{ x: 0.5, y: 0.45 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        {/* Brand chip top-left */}
        <View style={{ position: 'absolute', left: 12, top: 12 }}>{brandChip}</View>
        {/* Status pill top-right */}
        <View style={{ position: 'absolute', right: 12, top: 12, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {badge ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'System', fontVariant: ['tabular-nums'] }}>{badge}</Text>
            </View>
          ) : null}
          {open ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,159,110,0.95)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
              <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: '#fff' }} />
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>OPEN</Text>
            </View>
          ) : inviteOnly ? (
            <View style={{ backgroundColor: 'rgba(11,11,15,0.78)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>INVITE-ONLY</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 16, gap: 12 }}>
        <Text
          style={{ fontFamily: typography.fontFamily, fontSize: 19, lineHeight: 23, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4 }}
          numberOfLines={2}
        >
          {campaign.title}
        </Text>

        {/* Payout + Closes cells */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: redesign.radius.cell, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: redesign.color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairline }}>
            <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700', marginBottom: 4 }}>Reward</Text>
            <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
              {reward || '—'}
            </Text>
          </View>
          <View style={{ flex: 1, borderRadius: redesign.radius.cell, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: redesign.color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700' }}>Closes</Text>
              {!closed && days != null && days <= 1 ? <PulseDot /> : null}
            </View>
            <Text style={{ color: !closed && days != null && days <= 1 ? '#E5484D' : redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
              {closed ? 'Closed' : days == null ? 'Open' : days === 0 ? 'Last day' : `${days}d`}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MaterialCommunityIcons name="web" size={14} color={redesign.color.faint} />
            <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '600' }}>
              {formatPlatform(campaign.platforms?.[0])}
            </Text>
          </View>
          {campaign.requiredVideos ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name="video-outline" size={14} color={redesign.color.faint} />
              <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '600' }}>
                {campaign.requiredVideos} video{campaign.requiredVideos === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Apply pill — press and hold to charge, matching the campaign-detail CTA */}
        {showApply ? (
          <Animated.View style={popStyle}>
            <Pressable
              disabled={applyState !== 'idle'}
              onPressIn={(e) => { e.stopPropagation?.(); startHold() }}
              onPressOut={(e) => { e.stopPropagation?.(); cancelHold() }}
              onLayout={(e) => setBtnWidth(e.nativeEvent.layout.width)}
              accessibilityRole="button"
              accessibilityHint="Press and hold to send your application"
              style={{
                minHeight: 50,
                borderRadius: redesign.radius.pill,
                backgroundColor: applyState === 'applied' ? 'rgba(16,159,110,0.96)' : applyState === 'blocked' ? 'rgba(239,68,68,0.96)' : (applyState === 'idle' && applyGate) ? 'rgba(11,11,15,0.42)' : redesign.color.ink,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                overflow: 'hidden',
                ...redesign.shadow.cta,
              }}
            >
              {applyState === 'idle' && !applyGate ? (
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: 100, transform: [{ skewX: '-18deg' }] }, shimmerStyle]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              ) : null}
              {/* Charge fill — same glossy charcoal-over-ink build as the detail page */}
              {applyState === 'idle' ? (
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, chargeFillStyle]}>
                  {btnWidth > 0 ? (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{ width: btnWidth, height: '100%' }}
                    />
                  ) : null}
                  <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.85)' }} />
                </Animated.View>
              ) : null}
              {applyState === 'applied' ? (
                <>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>Applied</Text>
                </>
              ) : applyState === 'blocked' ? (
                <>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>Awaiting approval</Text>
                </>
              ) : applyState === 'pending' ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>Applying…</Text>
                </>
              ) : applyGate ? (
                <>
                  <MaterialCommunityIcons name="lock-outline" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>{applyGate}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="gesture-tap-hold" size={17} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>Hold to apply</Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  )

  const sheet = (
    <BrandSheet
      ref={brandSheetRef}
      data={{
        brandName: campaign.brandName,
        brandLogoUrl: campaign.brandLogoUrl,
        brandInstagram: campaign.brandInstagram,
        brandTiktok: campaign.brandTiktok,
      }}
    />
  )

  // Tier rings only on full-width cards — in the two-column grid the rings, seals
  // and the electric border's outside-the-frame strokes crowd/overlap neighbours.
  const tiered = compact ? (
    content
  ) : (
    <TierBorder tier={tiered2} radius={redesign.radius.card}>
      {content}
    </TierBorder>
  )

  const wrapped = (
    <Animated.View entering={FadeInDown.duration(200).delay(Math.min(index, 6) * 60)}>
      {onPress ? <PressableScale onPress={onPress} haptic={false}>{tiered}</PressableScale> : tiered}
    </Animated.View>
  )

  return <>{wrapped}{sheet}</>
}
