import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { Image as ExpoImage } from 'expo-image'
import * as Clipboard from 'expo-clipboard'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { approvalChip } from '@/features/campaigns/phase'
import { formatCampaignGoal, formatDateRange, getDaysLeft } from '@/features/core/format'
import { radii, redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CountUp, springs } from '@/features/motion/springs'
import { haptic } from '@/features/shared/haptics'
import { BrandSheet } from '@/features/shared/ui/BrandSheet'
import { CampaignBriefModal } from '@/features/campaigns/ui/CampaignBriefModal'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useApplyToCampaign, useCampaign, useCampaignDeliverables } from '@/features/campaigns/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { useCreatorProfile } from '@/features/profile/hooks'
import { LinkSubmitRow } from '@/features/shared/ui/LinkSubmitRow'
import { useDeliverables } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { PressableScale } from '@/features/shared/ui/PressableScale'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { toast } from '@/features/shared/ui/Toast'
import * as StoreReview from 'expo-store-review'
import * as SecureStore from 'expo-secure-store'

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const MEDAL: Record<number, { bg: string; text: string }> = {
  1: { bg: '#fef3c7', text: '#b45309' },
  2: { bg: '#f1f5f9', text: '#475569' },
  3: { bg: '#ffedd5', text: '#c2410c' },
}

// SEK prize amounts are hidden from creators — show the tier rank label only.
const TIER_LABELS: Record<number, string> = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' }

function formatPlatform(platform?: string | null) {
  if (!platform) return '-'
  return platform
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function canSubmitDeliverable(status: string) {
  return status === 'pending' || status === 'revision_requested'
}

function Section({
  icon,
  title,
  tint,
  accent,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  tint?: string
  accent?: string
  borderColor?: string
  children: ReactNode
}) {
  return (
    <View
      style={{
        backgroundColor: redesign.color.card,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        padding: 14,
        gap: 10,
        ...redesign.shadow.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tint || 'rgba(124,63,242,0.10)',
          }}
        >
          <MaterialCommunityIcons name={icon} size={16} color={accent || redesign.color.purple} />
        </View>
        <Text
          style={{
            color: redesign.color.faint,
            fontFamily: typography.fontFamily,
            fontWeight: '800',
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}


const SUB_LABEL = {
  fontFamily: typography.fontFamily,
  fontSize: 9.5,
  fontWeight: '800' as const,
  color: redesign.color.faint,
  letterSpacing: 1.0,
  textTransform: 'uppercase' as const,
}

function Chip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: bg }}>
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}


export default function CampaignDetailPage() {
  const { colors, palette } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id: string; tab?: string }>()
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab

  const { data: campaign, isLoading, error, refetch: refetchCampaign, isFetching, dataUpdatedAt } = useCampaign(campaignId)

  useFocusEffect(
    useCallback(() => {
      if (campaignId) {
        void refetchCampaign()
      }
    }, [campaignId, refetchCampaign])
  )

  useEffect(() => {
    if (campaign) {
      console.log('[campaign detail]', {
        id: campaign.id,
        endDate: campaign.endDate,
        daysLeft: getDaysLeft(campaign.endDate),
        isFetching,
        dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
      })
    }
  }, [campaign, isFetching, dataUpdatedAt])
  const { data: profile } = useCreatorProfile()
  const { data: campaignDeliverables, isLoading: loadingDeliverables } = useCampaignDeliverables(campaignId)
  const { data: allDeliverables, isLoading: loadingAllDeliverables } = useDeliverables()
  const applyMutation = useApplyToCampaign()
  const [activeTab, setActiveTab] = useState<'brief' | 'videos'>(
    initialTab === 'videos' ? 'videos' : 'brief'
  )
  const [leaderboard, setLeaderboard] = useState<{ rank: number; total_creators: number; my_views: number; my_likes: number; top_views: number } | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const { width: winW } = useWindowDimensions()
  const heroWidth = winW - 32 // Screen content has 16px horizontal padding each side
  const brandSheetRef = useRef<BottomSheetModal>(null)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const [tabMetrics, setTabMetrics] = useState<Record<'brief' | 'videos', { x: number; width: number }>>({
    brief: { x: 0, width: 0 },
    videos: { x: 0, width: 0 },
  })
  const bubbleLeft = useSharedValue(-100)
  const bubbleWidth = useSharedValue(0)
  const bubbleScale = useSharedValue(1)
  const bubbleInitialized = useRef(false)
  const scrollRef = useRef<ScrollView>(null)
  const videosY = useRef<number>(0)

  const profileComplete = profile ? isProfileComplete(profile) : false
  const currentApplicationStatus = campaign?.creatorApplicationStatus || null
  const applyBlockedByStatus = currentApplicationStatus === 'applied' || currentApplicationStatus === 'accepted'

  const handleApply = async () => {
    if (profile?.reviewStatus !== 'approved') {
      toast.error('Your creator account must be approved before applying.')
      return
    }

    if (!isProfileComplete(profile)) {
      toast.error('Complete your profile before applying.')
      return
    }

    try {
      await applyMutation.mutateAsync(campaignId)
      setApplySuccess(true)
      toast.success('Application sent!')
      StoreReview.isAvailableAsync().then(async (available) => {
        if (!available) return
        const REVIEW_KEY = 'last_review_request'
        const last = await SecureStore.getItemAsync(REVIEW_KEY).catch(() => null)
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        if (!last || Date.now() - Number(last) > thirtyDays) {
          await StoreReview.requestReview()
          await SecureStore.setItemAsync(REVIEW_KEY, String(Date.now())).catch(() => {})
        }
      }).catch(() => {})
    } catch (applyError) {
      toast.error(applyError instanceof Error ? applyError.message : 'Could not apply')
    }
  }

  const hashtagText = useMemo(() => {
    const tags = campaign?.requiredHashtags?.length ? campaign.requiredHashtags : ['#annons']
    const hasLikelab = tags.some((t) => t.toLowerCase() === '#likelab')
    return hasLikelab ? tags : [...tags, '#LikeLab']
  }, [campaign?.requiredHashtags])
  const visibleDeliverables = useMemo(() => {
    if ((campaignDeliverables || []).length) return campaignDeliverables || []
    return (allDeliverables || []).filter((item) => item.campaignId === campaignId)
  }, [allDeliverables, campaignDeliverables, campaignId])
  const primaryPlatform = campaign?.platforms?.[0] || visibleDeliverables?.[0]?.platform || 'TikTok'
  const daysLeft = getDaysLeft(campaign?.endDate)
  const heroImages = campaign
    ? (campaign.imageUrls?.length ? campaign.imageUrls : campaign.coverImageUrl ? [campaign.coverImageUrl] : [])
    : []
  const ctaState = applySuccess || applyBlockedByStatus
    ? {
        label: 'Application sent',
        helper: 'You already have an active application for this campaign.',
        disabled: true,
        tone: 'success' as const,
      }
    : profile?.reviewStatus !== 'approved'
      ? {
          label: 'Approval required',
          helper: 'Your creator account must be approved before you can apply.',
          disabled: true,
          tone: 'secondary' as const,
        }
      : !profileComplete
        ? {
            label: 'Complete profile first',
            helper: 'Finish your creator profile to unlock campaign applications.',
            disabled: true,
            tone: 'secondary' as const,
          }
        : applyMutation.isPending
          ? {
              label: 'Applying...',
              helper: 'Submitting your application now.',
              disabled: true,
              tone: 'primary' as const,
            }
          : {
              label: currentApplicationStatus === 'rejected' || currentApplicationStatus === 'withdrawn' ? 'Apply again' : 'Apply to campaign',
              helper: 'Send your application directly from this campaign workspace.',
              disabled: false,
              tone: 'primary' as const,
            }

  // Sticky CTA — OPAQUE bottom panel (#F4F3F0) anchored edge-to-edge into the
  // home-indicator area. Top hairline + upward shadow. Content must never bleed
  // through (the old translucent floating card showed scroll content behind it).
  const showStickyHelper = ctaState.disabled && ctaState.tone !== 'success'
  const stickyBar = campaign && currentApplicationStatus !== 'accepted' ? (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -insets.bottom,
      }}
    >
      <View
        style={{
          backgroundColor: redesign.color.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: redesign.color.hairlineStrong,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          gap: 14,
          ...redesign.shadow.stickyUp,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Closes in
            </Text>
            <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] }}>
              {daysLeft == null ? 'Open now' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Required videos
            </Text>
            <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] }}>
              {campaign.requiredVideos || 0}
            </Text>
          </View>
        </View>

        <LiquidButton
          label={ctaState.label}
          onPress={ctaState.disabled ? undefined : handleApply}
          disabled={ctaState.disabled}
          minHeight={54}
          borderRadius={20}
          tone={ctaState.tone === 'success' ? 'success' : ctaState.tone === 'secondary' ? 'neutral' : 'primary'}
          icon={ctaState.tone === 'success' ? <MaterialCommunityIcons name="check-circle" size={18} color="#0F9F6E" /> : undefined}
          trailingIcon={ctaState.tone === 'primary' && !ctaState.disabled ? <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" /> : undefined}
        />

        {showStickyHelper ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: redesign.color.muted, fontSize: 12, lineHeight: 18, fontFamily: typography.fontFamily }}>
              {ctaState.helper}
            </Text>
            {!profileComplete && profile?.reviewStatus === 'approved' ? (
              <Pressable onPress={() => router.push('/settings')}>
                <Text style={{ color: redesign.color.purple, fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily }}>
                  Complete profile
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  ) : null

  useEffect(() => {
    if (!campaignId) return
    void Promise.resolve(
      supabase.rpc('get_campaign_leaderboard_position', { p_campaign_id: campaignId })
        .then(({ data }) => { if (data && data.length > 0) setLeaderboard(data[0]) })
    ).catch(() => {})
  }, [campaignId])

  useEffect(() => {
    setActiveTab(initialTab === 'videos' ? 'videos' : 'brief')
  }, [initialTab])

  useEffect(() => {
    if (activeTab !== 'videos' || loadingDeliverables || loadingAllDeliverables) return
    if (!visibleDeliverables.length) return
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: videosY.current, animated: true })
    }, 350)
    return () => clearTimeout(timeout)
  }, [activeTab, loadingDeliverables, loadingAllDeliverables, visibleDeliverables.length])

  // Snap to position on first layout (no animation)
  useEffect(() => {
    const metric = tabMetrics[activeTab]
    if (!metric?.width || bubbleInitialized.current) return
    const inset = 1
    bubbleLeft.value = metric.x + inset
    bubbleWidth.value = Math.max(0, metric.width - inset * 2)
    bubbleInitialized.current = true
  }, [activeTab, tabMetrics, bubbleLeft, bubbleWidth])

  // Spring to position on tab switch
  useEffect(() => {
    const metric = tabMetrics[activeTab]
    if (!metric?.width || !bubbleInitialized.current) return
    const inset = 1
    bubbleLeft.value = withSpring(metric.x + inset, springs.snappy)
    bubbleWidth.value = withSpring(Math.max(0, metric.width - inset * 2), springs.snappy)
    bubbleScale.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 180 }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const tabBubbleStyle = useAnimatedStyle(() => ({
    left: bubbleLeft.value,
    width: bubbleWidth.value,
    transform: [{ scale: bubbleScale.value }],
  }))

  const hasBriefDetails = !!(
    campaign &&
    (campaign.campaignGoal || campaign.description || campaign.preferredCreators || campaign.instructions ||
      campaign.videoRequirements || campaign.briefGuidelines || (campaign.keyMessages || []).length ||
      campaign.brandVoice || campaign.brandTone || campaign.targetAudience || campaign.thingsToAvoid)
  )

  const readFullBriefButton = (
    <Pressable
      onPress={() => { haptic.medium(); setBriefOpen(true) }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 18, borderRadius: radii.full, backgroundColor: 'rgba(124,63,242,0.10)' }}
    >
      <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800' }}>Read full brief</Text>
      <MaterialCommunityIcons name="arrow-right" size={16} color={redesign.color.purple} />
    </Pressable>
  )

  return (
    <>
      <CampaignBriefModal visible={briefOpen} onClose={() => setBriefOpen(false)} campaign={campaign ?? null} />
      <BrandSheet
        ref={brandSheetRef}
        data={campaign ? {
          brandName: campaign.brandName,
          brandLogoUrl: campaign.brandLogoUrl,
          brandInstagram: campaign.brandInstagram,
          brandTiktok: campaign.brandTiktok,
        } : null}
      />
      <Screen tabAware={false} overlay={stickyBar} overlayPadding={150} scrollRef={scrollRef} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={palette.textMuted} />
          <Text style={{ color: palette.textMuted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back to campaigns</Text>
        </Pressable>
      </Animated.View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load this campaign.</Text> : null}

      {campaign ? (
        <>
          <Animated.View entering={FadeInDown.duration(250).delay(80)}>
            <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: '#0E0A1C', ...redesign.shadow.card }}>
              <View style={{ height: 210, backgroundColor: '#1A0F2E' }}>
                {/* Swipeable image gallery (Tradera-style) */}
                {heroImages.length > 1 ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      const i = Math.round(e.nativeEvent.contentOffset.x / heroWidth)
                      if (i !== activeImage) setActiveImage(i)
                    }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {heroImages.map((uri, i) => (
                      <ExpoImage
                        key={`${uri}-${i}`}
                        source={{ uri }}
                        style={{ width: heroWidth, height: 210 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    ))}
                  </ScrollView>
                ) : heroImages.length === 1 ? (
                  <ExpoImage
                    source={{ uri: heroImages[0] }}
                    style={{ position: 'absolute', inset: 0 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={300}
                  />
                ) : null}

                {/* Bottom scrim for text readability */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['transparent', 'rgba(8,4,18,0.94)']}
                  start={{ x: 0.5, y: 0.3 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', inset: 0 }}
                />

                {/* Brand chip top-left */}
                <Pressable
                  style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 4, paddingRight: 11, paddingVertical: 4 }}
                  onPress={() => (campaign.brandInstagram || campaign.brandTiktok) ? brandSheetRef.current?.present() : undefined}
                  disabled={!campaign.brandInstagram && !campaign.brandTiktok}
                >
                  <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={20} />
                  <Text style={{ color: redesign.color.ink, fontSize: 12.5, fontWeight: '700', fontFamily: typography.fontFamily, maxWidth: 150 }} numberOfLines={1}>
                    {campaign.brandName || 'Brand'}
                  </Text>
                </Pressable>

                {/* Image counter top-right */}
                {heroImages.length > 1 ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(11,11,15,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                      {activeImage + 1}/{heroImages.length}
                    </Text>
                  </View>
                ) : null}

                {/* Pagination dots */}
                {heroImages.length > 1 ? (
                  <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                    {heroImages.map((_, i) => (
                      <View
                        key={i}
                        style={{ width: i === activeImage ? 16 : 6, height: 6, borderRadius: 999, backgroundColor: i === activeImage ? '#fff' : 'rgba(255,255,255,0.5)' }}
                      />
                    ))}
                  </View>
                ) : null}

                {/* Bottom content */}
                <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 18, paddingBottom: heroImages.length > 1 ? 26 : 18, gap: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5, fontFamily: typography.fontFamily }} numberOfLines={3}>
                    {campaign.title}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="web" size={13} color="rgba(255,255,255,0.55)" />
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>
                        {formatPlatform(primaryPlatform)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={13} color="rgba(255,255,255,0.55)" />
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>
                        {formatDateRange(campaign.startDate, campaign.endDate) || '-'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={{ flexDirection: 'row', gap: 6, padding: 5, borderRadius: 16, backgroundColor: '#ECEAE4' }}>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 5,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  shadowColor: '#0B0B0F',
                  shadowOpacity: 0.10,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 3,
                },
                tabBubbleStyle,
              ]}
            />
            {([
              { key: 'brief', icon: 'file-document-outline', label: 'Brief' },
              { key: 'videos', icon: 'video-outline', label: `Videos ${campaignDeliverables?.length ?? 0}/${campaign.requiredVideos ?? 0}` },
            ] as const).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => { haptic.selection(); setActiveTab(tab.key) }}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout
                  setTabMetrics((prev) => {
                    const cur = prev[tab.key]
                    if (cur && cur.x === x && cur.width === width) return prev
                    return { ...prev, [tab.key]: { x, width } }
                  })
                }}
                style={{ flex: 1, height: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <MaterialCommunityIcons name={tab.icon} size={17} color={activeTab === tab.key ? redesign.color.ink : redesign.color.faint} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: activeTab === tab.key ? '800' : '600', color: activeTab === tab.key ? redesign.color.ink : redesign.color.muted }}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'brief' && (
            <>
              {/* Goal + full-brief entry */}
              {campaign.campaignGoal || campaign.description ? (
                <Section icon="target" title="Campaign Goal" tint="rgba(124,63,242,0.12)">
                  {campaign.campaignGoal ? (
                    <Text style={{ fontSize: 16, color: redesign.color.ink, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3, fontFamily: typography.fontFamily }}>
                      {formatCampaignGoal(campaign.campaignGoal)}
                    </Text>
                  ) : null}
                  {campaign.description ? (
                    <Text numberOfLines={3} style={{ fontSize: 14.5, color: redesign.color.muted, lineHeight: 22, fontFamily: typography.fontFamily }}>
                      {campaign.description}
                    </Text>
                  ) : null}
                  {hasBriefDetails ? readFullBriefButton : null}
                </Section>
              ) : hasBriefDetails ? (
                <Section icon="file-document-outline" title="Brief" tint="rgba(124,63,242,0.12)">
                  {readFullBriefButton}
                </Section>
              ) : null}

              {/* Quick facts */}
              {(() => {
                const cells = [
                  { label: 'Videos', value: campaign.requiredVideos },
                  { label: 'Creation days', value: campaign.creationDays },
                  { label: 'Review days', value: campaign.reviewDays },
                ].filter((c) => c.value != null)
                if (!cells.length) return null
                return (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {cells.map((cell) => (
                      <View
                        key={cell.label}
                        style={{
                          flex: 1,
                          backgroundColor: redesign.color.card,
                          borderRadius: 18,
                          paddingVertical: 16,
                          paddingHorizontal: 8,
                          alignItems: 'center',
                          gap: 4,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: redesign.color.hairlineStrong,
                          ...redesign.shadow.card,
                        }}
                      >
                        <CountUp
                          value={Number(cell.value) || 0}
                          duration={600}
                          style={{
                            fontFamily: typography.fontFamily,
                            fontSize: 26,
                            fontWeight: '800',
                            color: redesign.color.ink,
                            letterSpacing: -1,
                            padding: 0,
                            minWidth: 26,
                            textAlign: 'center',
                          }}
                        />
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
                          {cell.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )
              })()}

              {/* Requirements — disclosure + platforms + hashtags in one dense card */}
              {(campaign.requiredDisclosure || (campaign.platforms || []).length > 0 || hashtagText.length > 0) ? (
                <Section icon="check-circle-outline" title="Requirements" tint="rgba(124,63,242,0.10)">
                  <View style={{ gap: 14 }}>
                    {campaign.requiredDisclosure ? (
                      <View style={{ gap: 7 }}>
                        <Text style={SUB_LABEL}>Disclosure</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                          <Chip label={campaign.requiredDisclosure} bg="rgba(245,199,60,0.16)" color="#B45309" />
                        </View>
                      </View>
                    ) : null}

                    {(campaign.platforms || []).length > 0 ? (
                      <View style={{ gap: 7 }}>
                        <Text style={SUB_LABEL}>Platforms</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                          {campaign.platforms?.map((p, i) => (
                            <Chip key={i} label={formatPlatform(p)} bg="rgba(124,63,242,0.10)" color="#6D28D9" />
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {hashtagText.length > 0 ? (
                      <View style={{ gap: 7 }}>
                        <Text style={SUB_LABEL}>{copiedTag ? 'Copied!' : 'Hashtags · tap to copy'}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                          {hashtagText.map((tag, i) => (
                            <Pressable
                              key={`${tag}-${i}`}
                              onPress={async () => {
                                await Clipboard.setStringAsync(tag)
                                setCopiedTag(tag)
                                setTimeout(() => setCopiedTag(null), 2000)
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.full, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: 'rgba(124,63,242,0.10)' }}
                            >
                              <Text style={{ color: '#6D28D9', fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>{tag}</Text>
                              <MaterialCommunityIcons
                                name={copiedTag === tag ? 'check' : 'content-copy'}
                                size={12}
                                color={copiedTag === tag ? '#16A34A' : '#6D28D9'}
                              />
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                </Section>
              ) : null}

              {/* Example Links */}
              {(campaign.exampleLinks || []).length > 0 ? (
                <Section icon="link-variant" title="Example Links" tint="rgba(96,165,250,0.14)">
                  <View style={{ gap: 12 }}>
                    {campaign.exampleLinks?.map((link) => (
                      <Pressable key={link} onPress={() => Linking.openURL(link).catch(() => undefined)}>
                        <Text style={{ color: '#2563EB', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '600' }}>{link}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Section>
              ) : null}

              {/* Prize Distribution — only visible for accepted creators */}
              {currentApplicationStatus === 'accepted' && (campaign.prizeDistribution || []).length > 0 ? (
                <Section icon="trophy-outline" title="Prize Distribution" tint="rgba(251,191,36,0.16)" borderColor="rgba(253,230,138,0.8)">
                  <View style={{ gap: 10 }}>
                    {campaign.prizeDistribution?.map((_amount, i) => {
                      const medal = MEDAL[i + 1] || { bg: palette.cardBg, text: palette.textMuted }
                      return (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: medal.bg,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '800', fontSize: 13, color: medal.text }}>
                              {i + 1}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: palette.text }}>
                            {TIER_LABELS[i + 1] || `Tier ${i + 1}`}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </Section>
              ) : null}
            </>
          )}

          {activeTab === 'videos' ? (
            <View onLayout={(e) => { videosY.current = e.nativeEvent.layout.y }}>
              {loadingDeliverables || loadingAllDeliverables ? <ActivityIndicator color={colors.primary} /> : null}

              {leaderboard ? (
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                  {(() => {
                    const pct = leaderboard.top_views > 0 ? Math.max(4, (leaderboard.my_views / leaderboard.top_views) * 100) : 4
                    return (
                      <PressableScale onPress={() => router.push(`/leaderboard/${campaignId}`)} haptic={false} style={{ borderRadius: 20, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, backgroundColor: redesign.color.card, gap: 12, ...redesign.shadow.card }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 14, padding: 1.5, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 12.5, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: typography.fontFamily, fontWeight: '900', fontSize: 15, color: '#fff' }}>#{leaderboard.rank}</Text>
                            </View>
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '800', fontSize: 14.5, color: redesign.color.ink, letterSpacing: -0.2 }}>Your Position</Text>
                            <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: redesign.color.muted, marginTop: 1 }}>
                              #{leaderboard.rank} of {leaderboard.total_creators} creators
                            </Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: redesign.color.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtNum(leaderboard.my_views)} views</Text>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>Leader {fmtNum(leaderboard.top_views)}</Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
                          <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${pct}%`, borderRadius: 999 }} />
                        </View>
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '800', color: redesign.color.purple, textAlign: 'center' }}>
                          View full leaderboard →
                        </Text>
                      </PressableScale>
                    )
                  })()}
                </Animated.View>
              ) : null}

              <FlatList
                data={visibleDeliverables}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                ListEmptyComponent={
                  !loadingDeliverables && !loadingAllDeliverables ? (
                    <EmptyState title="No Videos Yet" subtitle="Assigned deliverables will appear in this tab." icon="video-outline" />
                  ) : null
                }
                renderItem={({ item }) => (
                  <Section icon="video-outline" title={item.campaignTitle || 'Deliverable'} tint="rgba(96,165,250,0.14)">
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: palette.text, fontFamily: typography.fontFamily }}>
                        {`${formatPlatform(item.platform || 'tiktok')} ${item.type ? `- ${formatPlatform(item.type)}` : ''}`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {(() => {
                          const chip = approvalChip(campaign?.phase, item.approvalStatus, item.readyForPosting)
                          return chip ? (
                            <View style={{ borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: chip.bg }}>
                              <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', color: chip.text }}>
                                {chip.label}
                              </Text>
                            </View>
                          ) : null
                        })()}
                        <StatusBadge status={item.status} />
                      </View>
                    </View>
                    {item.notes ? (
                      <Text style={{ color: palette.textMuted, fontSize: 13, lineHeight: 20, fontFamily: typography.fontFamily }}>{item.notes}</Text>
                    ) : null}
                    {item.status === 'revision_requested' && item.flagReason ? (
                      <View
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#FDBA74',
                          backgroundColor: '#FFF7ED',
                          padding: 12,
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: '#C2410C', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>REVISION REQUESTED</Text>
                        <Text style={{ color: '#9A3412', fontSize: 14, lineHeight: 20, fontFamily: typography.fontFamily }}>
                          {item.flagReason}
                        </Text>
                      </View>
                    ) : null}
                    {canSubmitDeliverable(item.status) ? (
                      <LinkSubmitRow
                        deliverableId={item.id}
                        submitLabel={item.status === 'revision_requested' ? 'Re-submit link' : 'Submit link'}
                      />
                    ) : item.url && /^https?:\/\//i.test(item.url) ? (
                      <Pressable
                        onPress={() => Linking.openURL(item.url || '').catch(() => undefined)}
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: palette.borderColor,
                          backgroundColor: palette.inputBg,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          gap: 4,
                        }}
                      >
                        <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.7 }}>SUBMITTED URL</Text>
                        <Text numberOfLines={2} style={{ color: colors.primary, fontSize: 14, fontFamily: typography.fontFamily }}>
                          {item.url}
                        </Text>
                      </Pressable>
                    ) : item.url ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons name="check-circle" size={18} color="#0F9F6E" />
                        <Text style={{ color: '#0F9F6E', fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily }}>
                          Video submitted
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: palette.textMuted, fontSize: 13, fontFamily: typography.fontFamily }}>No URL submitted yet.</Text>
                    )}
                  </Section>
                )}
              />
            </View>
          ) : null}

        </>
      ) : null}
    </Screen>
    </>
  )
}
