import { Image as ExpoImage } from 'expo-image'
import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { Campaign } from '@/features/core/types'
import { useEffect, useRef, useState } from 'react'
import { formatCampaignGoal, formatDateRange } from '@/features/core/format'
import { radii, shadows, spacing, typography } from '@/features/core/theme'
import { BlurView } from 'expo-blur'
import { GlassCard } from '@/features/shared/ui/GlassCard'
import { haptic } from '@/features/shared/haptics'
import { BrandSheet } from '@/features/shared/ui/BrandSheet'
import { useTheme } from '@/features/core/useTheme'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { CampaignPhaseBadge } from '@/features/shared/ui/CampaignPhaseBadge'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import Animated, { FadeInDown, interpolate, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, ReduceMotion } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'

type Props = {
  campaign: Campaign
  onPress?: () => void
  onApply?: () => false | void
  badge?: number
  compact?: boolean
  index?: number
}

function creatorStatus(campaign: Campaign) {
  if (campaign.creatorApplicationStatus === 'accepted') return 'accepted'
  return campaign.creatorApplicationStatus || campaign.invitationStatus || campaign.status
}

function daysRemaining(endDate?: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}

function formatReward(campaign: Campaign): string | null {
  // SEK reward amounts are hidden from creators — surface the reward type or
  // the brand's description, never the kronor figure.
  if (campaign.rewardDescription) return campaign.rewardDescription
  if (campaign.rewardType) return campaign.rewardType
  return null
}

function canApply(campaign: Campaign): boolean {
  return !campaign.creatorApplicationStatus && !campaign.invitationStatus
}

function isNew(campaign: Campaign): boolean {
  if (!campaign.createdAt) return false
  const ageMs = Date.now() - new Date(campaign.createdAt).getTime()
  return ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000
}

function brandVerified(campaign: Campaign): boolean {
  return !!(campaign.brandInstagram && campaign.brandTiktok)
}

export function CampaignCard({ campaign, onPress, onApply, badge, compact, index = 0 }: Props) {
  'use no memo'
  const { colors, palette } = useTheme()
  const brandSheetRef = useRef<BottomSheetModal>(null)
  const [applyState, setApplyState] = useState<'idle' | 'applied' | 'blocked'>('idle')
  const days = daysRemaining(campaign.endDate)
  const reward = formatReward(campaign)
  const showApply = canApply(campaign) && !!onApply
  const hasSocials = !!(campaign.brandInstagram || campaign.brandTiktok)
  const hasUrgentDeliverables = !!badge && badge > 0

  const shimmer = useSharedValue(0)
  const [btnWidth, setBtnWidth] = useState(0)
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      -1,
      false,
    )
  }, [shimmer])

  const shimmerStyle = useAnimatedStyle(() => {
    const distance = btnWidth + 120
    return {
      transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-120, distance]) }],
    }
  })

  function handleApply() {
    if (!onApply) return
    haptic.medium()
    const result = onApply()
    if (result === false) {
      haptic.warning()
      setApplyState('blocked')
      setTimeout(() => setApplyState('idle'), 2500)
    } else {
      haptic.success()
      setApplyState('applied')
      setTimeout(() => setApplyState('idle'), 2500)
    }
  }


  const content = compact ? (
    <View
      style={{
        backgroundColor: palette.cardBg,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: palette.borderSoft,
        overflow: 'hidden',
        ...shadows.card,
      }}
    >
      <View style={{ height: 110, backgroundColor: palette.neutralBg }}>
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
            <MaterialCommunityIcons name="bullhorn-outline" size={26} color={palette.textMuted} />
          </View>
        )}
        <View style={{ position: 'absolute', right: 8, top: 8, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {badge ? (
            <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: 'System' }}>{badge}</Text>
            </View>
          ) : null}
          {campaign.phase ? <CampaignPhaseBadge phase={campaign.phase} /> : null}
          <StatusBadge status={creatorStatus(campaign) || undefined} />
        </View>
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: palette.text, letterSpacing: -0.2 }} numberOfLines={2}>
          {campaign.title}
        </Text>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={14} />
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '500', flex: 1 }} numberOfLines={1}>
            {campaign.brandName || 'Brand'}
          </Text>
        </View>
        {reward ? (
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <MaterialCommunityIcons name="wallet-giftcard" size={11} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
              {reward}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  ) : (
    <GlassCard
      radius={radii.card}
      style={hasUrgentDeliverables ? { borderWidth: 2, borderColor: '#EF4444' } : undefined}
    >
      {/* Cover image */}
      <View style={{ height: 170, backgroundColor: palette.neutralBg }}>
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
        {/* Top-right badges */}
        <View style={{ position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {badge ? (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: 'System' }}>{badge}</Text>
            </View>
          ) : null}
          {campaign.phase ? <CampaignPhaseBadge phase={campaign.phase} /> : null}
          <StatusBadge status={creatorStatus(campaign) || undefined} />
        </View>
        {/* Reward pill — bottom of image */}
        {reward ? (
          <View style={{ position: 'absolute', left: 10, bottom: 10 }}>
            <View style={{
              backgroundColor: '#11192F',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 7,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              maxWidth: 220,
            }}>
              <MaterialCommunityIcons name="wallet-giftcard" size={13} color="#FFD700" />
              <Text numberOfLines={1} style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', flexShrink: 1 }}>
                {reward}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 13, gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.55)', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,1)' }}>
        {/* Premium meta-row */}
        {(() => {
          const open = canApply(campaign) && !campaign.invitationStatus
          const inviteOnly = !!campaign.invitationStatus
          const fresh = isNew(campaign)
          const verified = brandVerified(campaign)
          const showDays = days !== null
          if (!open && !inviteOnly && !fresh && !verified && !showDays) return null
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {open ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(52,199,89,0.14)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 0.5, borderColor: 'rgba(52,199,89,0.3)' }}>
                  <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: '#34C759' }} />
                  <Text style={{ color: '#1F7A38', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>OPEN</Text>
                </View>
              ) : null}
              {inviteOnly ? (
                <View style={{ backgroundColor: 'rgba(58,31,122,0.12)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 0.5, borderColor: 'rgba(58,31,122,0.22)' }}>
                  <Text style={{ color: '#3A1F7A', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>INVITE-ONLY</Text>
                </View>
              ) : null}
              {fresh ? (
                <View style={{ backgroundColor: 'rgba(8,8,12,0.92)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 }}>
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }}>NEW</Text>
                </View>
              ) : null}
              {showDays ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: days <= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(28,28,30,0.06)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 0.5, borderColor: days <= 3 ? 'rgba(239,68,68,0.28)' : 'rgba(28,28,30,0.08)' }}>
                  <Text style={{ color: days <= 3 ? '#B91C1C' : palette.text, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', letterSpacing: -0.2 }}>
                    {days === 0 ? '1' : days}
                  </Text>
                  <Text style={{ color: days <= 3 ? '#B91C1C' : palette.textMuted, fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>
                    {days === 0 ? 'LAST DAY' : days === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
                  </Text>
                </View>
              ) : null}
              {verified ? (
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MaterialCommunityIcons name="check-decagram" size={13} color="#1DA1F2" />
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '700', letterSpacing: 1.0 }}>VERIFIED</Text>
                </View>
              ) : null}
            </View>
          )
        })()}

        {/* Title + tap hint */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 15,
              lineHeight: 19,
              fontWeight: '700',
              color: palette.text,
              letterSpacing: -0.25,
              flex: 1,
            }}
            numberOfLines={2}
          >
            {campaign.title}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={palette.textMuted} />
        </View>

        {/* Apply button — full width */}
        {showApply ? (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); handleApply() }}
            onLayout={(e) => setBtnWidth(e.nativeEvent.layout.width)}
            style={{
              flex: 1,
              marginTop: 4,
              minHeight: 50,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.14)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.22)',
              backgroundColor: applyState === 'applied' ? 'rgba(22,163,74,0.95)' : applyState === 'blocked' ? 'rgba(239,68,68,0.95)' : 'rgba(8,8,12,0.96)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
              {applyState === 'idle' ? (
                <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, width: 100, transform: [{ skewX: '-18deg' }] }, shimmerStyle]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              ) : null}
              {applyState === 'applied' ? (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>
                    Applied!
                  </Text>
                </>
              ) : applyState === 'blocked' ? (
                <>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>
                    Awaiting approval
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>
                    Apply Now
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </>
              )}
          </Pressable>
        ) : null}
      </View>

      {/* Brand — separate glass row */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); if (hasSocials) brandSheetRef.current?.present() }}
        style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.45)', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.8)', paddingVertical: 10, paddingHorizontal: 13 }}
      >
          <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
              {campaign.brandName || 'Brand'}
            </Text>
            {hasSocials ? (
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '500' }}>
                View socials →
              </Text>
            ) : null}
          </View>
        {hasSocials ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
        ) : null}
      </Pressable>
    </GlassCard>
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

  const wrapped = (
    <Animated.View entering={FadeInDown.duration(200).delay(index * 80)}>
      {onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content}
    </Animated.View>
  )

  return <>{wrapped}{sheet}</>
}
