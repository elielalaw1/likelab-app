import { Image as ExpoImage } from 'expo-image'
import { Linking, Modal, Pressable, Text, View } from 'react-native'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { Campaign } from '@/features/core/types'
import { useEffect, useState } from 'react'
import { formatCampaignGoal, formatDateRange } from '@/features/core/format'
import { glass, radii, shadows, spacing, typography } from '@/features/core/theme'
import { BlurView } from 'expo-blur'
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

export function CampaignCard({ campaign, onPress, onApply, badge, compact, index = 0 }: Props) {
  'use no memo'
  const { colors, palette } = useTheme()
  const [showBrandPopup, setShowBrandPopup] = useState(false)
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
    const result = onApply()
    if (result === false) {
      setApplyState('blocked')
      setTimeout(() => setApplyState('idle'), 2500)
    } else {
      setApplyState('applied')
      setTimeout(() => setApplyState('idle'), 2500)
    }
  }

  function openSocial(handle: string, platform: 'instagram' | 'tiktok') {
    const clean = handle.replace(/^@/, '')
    Linking.openURL(platform === 'instagram' ? `https://instagram.com/${clean}` : `https://tiktok.com/@${clean}`)
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
    <View
      style={{
        backgroundColor: 'transparent',
        borderRadius: radii.card,
        borderWidth: hasUrgentDeliverables ? 2 : 0.5,
        borderColor: hasUrgentDeliverables ? '#EF4444' : 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
        ...shadows.card,
      }}
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
              <Text numberOfLines={1} style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', flexShrink: 1 }}>
                {reward}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <BlurView intensity={glass.blurIntensityCard} tint="light" style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.9)' }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.88)' }}>
        {/* Title + tap hint */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 17,
              lineHeight: 22,
              fontWeight: '700',
              color: palette.text,
              letterSpacing: -0.3,
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
                <Text style={{ color: days <= 3 ? '#EF4444' : palette.text, fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '800', lineHeight: 24, letterSpacing: -0.5 }}>
                  {days === 0 ? '1' : days}
                </Text>
                <Text style={{ color: days <= 3 ? '#EF4444' : palette.textMuted, fontFamily: typography.fontFamilyLight, fontSize: 10, fontWeight: '300', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 }}>
                  {days === 0 ? 'last day' : 'days left'}
                </Text>
              </View>
            ) : null}
          <Animated.View style={[{ flex: 1 }, applyState === 'idle' ? pulseStyle : undefined]}>
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); handleApply() }}
            style={{
              borderRadius: radii.button,
              overflow: 'hidden',
              marginTop: 4,
            }}
          >
            <View style={{
              backgroundColor: applyState === 'applied' ? '#16A34A' : applyState === 'blocked' ? '#EF4444' : glass.darkButton,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              {applyState === 'applied' ? (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>
                    Applied!
                  </Text>
                </>
              ) : applyState === 'blocked' ? (
                <>
                  <MaterialCommunityIcons name="clock-alert-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>
                    Awaiting approval
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>
                    Apply Now
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                </>
              )}
            </View>
          </Pressable>
          </Animated.View>
          </View>
        ) : null}

        {/* Brand — bottom */}
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); if (hasSocials) setShowBrandPopup(true) }}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderColor: palette.borderSoft, paddingTop: 12, marginTop: 4 }}
        >
          <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
              {campaign.brandName || 'Brand'}
            </Text>
            {hasSocials ? (
              <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500' }}>
                View socials →
              </Text>
            ) : null}
          </View>
          {hasSocials ? (
            <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
          ) : null}
        </Pressable>
      </View>
      </BlurView>
    </View>
  )

  const brandPopup = (
    <Modal transparent animationType="fade" visible={showBrandPopup} onRequestClose={() => setShowBrandPopup(false)}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowBrandPopup(false)}>
        <Pressable style={{ backgroundColor: '#1a1a1a', borderRadius: 20, padding: 24, width: 280, gap: 16 }} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={36} />
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: typography.fontFamily }}>
              {campaign.brandName || 'Brand'}
            </Text>
          </View>
          {campaign.brandInstagram ? (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}
              onPress={() => { setShowBrandPopup(false); openSocial(campaign.brandInstagram!, 'instagram') }}
            >
              <MaterialCommunityIcons name="instagram" size={22} color="#E1306C" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: typography.fontFamily }}>
                {campaign.brandInstagram}
              </Text>
            </Pressable>
          ) : null}
          {campaign.brandTiktok ? (
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 14 }}
              onPress={() => { setShowBrandPopup(false); openSocial(campaign.brandTiktok!, 'tiktok') }}
            >
              <FontAwesome5 name="tiktok" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: typography.fontFamily }}>
                {campaign.brandTiktok}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  )

  const wrapped = (
    <Animated.View entering={FadeInDown.duration(200).delay(index * 80)}>
      {onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content}
    </Animated.View>
  )

  return <>{wrapped}{brandPopup}</>
}
