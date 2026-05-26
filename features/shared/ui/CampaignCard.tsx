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
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, ReduceMotion } from 'react-native-reanimated'

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

const MONETARY_REWARD_TYPES = ['cash', 'commission', 'voucher', 'gift card']

function formatReward(campaign: Campaign): string | null {
  const type = campaign.rewardType || ''
  const isMonetary = MONETARY_REWARD_TYPES.some((t) => type.toLowerCase().includes(t))

  if (isMonetary && campaign.rewardAmount) return `${campaign.rewardAmount} ${type}`
  if (isMonetary && campaign.rewardValue) return `${campaign.rewardValue} ${type}`
  if (campaign.rewardDescription) return campaign.rewardDescription
  if (type) return type
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

  const pulse = useSharedValue(1)
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.Never }),
      -1,
      true
    )
  }, [])

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }))

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
          if (!open && !inviteOnly && !fresh && !verified) return null
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

        {/* Apply button + days remaining on same row */}
        {showApply ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
            {days !== null ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, minWidth: 56 }}>
                <Text style={{ color: days <= 3 ? '#EF4444' : palette.text, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', lineHeight: 20, letterSpacing: -0.4 }}>
                  {days === 0 ? '1' : days}
                </Text>
                <Text style={{ color: days <= 3 ? '#EF4444' : palette.textMuted, fontFamily: typography.fontFamilyLight, fontSize: 9, fontWeight: '300', textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 1 }}>
                  {days === 0 ? 'last day' : 'days left'}
                </Text>
              </View>
            ) : null}
          <Animated.View style={[{ flex: 1 }, applyState === 'idle' ? pulseStyle : undefined]}>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); handleApply() }}
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              marginTop: 4,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <BlurView intensity={16} tint="dark" style={{ borderRadius: 14, overflow: 'hidden' }}>
            <View style={{
              backgroundColor: applyState === 'applied' ? 'rgba(22,163,74,0.92)' : applyState === 'blocked' ? 'rgba(239,68,68,0.92)' : 'rgba(8,8,12,0.96)',
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.14)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.22)',
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
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
            </View>
            </BlurView>
          </Pressable>
          </Animated.View>
          </View>
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
