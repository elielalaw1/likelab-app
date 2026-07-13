import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'

import { Image as ExpoImage } from 'expo-image'
import * as Clipboard from 'expo-clipboard'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { Easing, Extrapolation, FadeInDown, FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { formatCampaignGoal, formatRewardType, getDaysLeft, isCampaignClosed } from '@/features/core/format'
import { radii, redesign, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CountUp, springs } from '@/features/motion/springs'
import { haptic } from '@/features/shared/haptics'
import { BrandSheet } from '@/features/shared/ui/BrandSheet'
import { ApplyInfoSheet } from '@/features/campaigns/ui/ApplyInfoSheet'
import { HoldToApplyButton } from '@/features/campaigns/ui/HoldToApplyButton'
import { TermsSheet } from '@/features/campaigns/ui/TermsSheet'
import { AD_STYLES, BriefAccordion, BriefDocument, type BriefDocSection, type BriefStep, BriefWalkthrough, CampaignGlance, DosDontsBody, ExpandableText, type GlanceRow, ProductBody, openExternalUrl } from '@/features/campaigns/ui/BriefSections'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useApplyToCampaign, useCampaign, useCampaignDeliverables } from '@/features/campaigns/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { useCreatorProfile } from '@/features/profile/hooks'
import { CampaignVideoGrid } from '@/features/deliverables/ui/CampaignVideoGrid'
import { resolveStage, STAGE_UI } from '@/features/deliverables/stage'
import { useDeliverables } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { Bone } from '@/features/shared/ui/SkeletonCard'
import { toast } from '@/features/shared/ui/Toast'
import * as StoreReview from 'expo-store-review'
import * as SecureStore from 'expo-secure-store'

// Hero image height — taller than the old 210 so the campaign photo actually reads
// as the hero. The title now sits below the image (not overlaid), so nothing covers it.
const HERO_H = 280

// Applications are only accepted while a campaign is live and in its application
// window. These are the clearly-terminal statuses / past phases where the Apply CTA
// must be disabled — a conservative blocklist, so published/open campaigns in the
// application period (or with no phase set yet) are never wrongly blocked.
const APPLICATION_CLOSED_STATUSES = new Set(['completed', 'ended', 'paused', 'cancelled', 'rejected'])
const APPLICATION_CLOSED_PHASES = new Set(['creator_selection', 'product_sendout', 'filming_period', 'video_selection', 'posting'])







export default function CampaignDetailPage() {
  const { colors, palette } = useTheme()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id: string; tab?: string }>()
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab

  const { data: campaign, isLoading, error, refetch: refetchCampaign } = useCampaign(campaignId)

  // Hero choreography: the photo settles from a gentle zoom on entry, and pulling
  // down past the top stretches it (the classic elastic hero) — both purely visual,
  // driven by the Screen's mirrored scroll offset.
  const scrollY = useSharedValue(0)
  const heroSettle = useSharedValue(1.14)
  useEffect(() => {
    heroSettle.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) })
  }, [heroSettle])
  const heroZoomStyle = useAnimatedStyle(() => {
    const stretch = interpolate(scrollY.value, [-160, 0], [1.32, 1], Extrapolation.CLAMP)
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [-160, 0], [-26, 0], Extrapolation.CLAMP) },
        { scale: stretch * heroSettle.value },
      ],
    }
  })

  useFocusEffect(
    useCallback(() => {
      if (campaignId) {
        void refetchCampaign()
      }
    }, [campaignId, refetchCampaign])
  )

  const { data: profile } = useCreatorProfile()
  const { data: campaignDeliverables, isLoading: loadingDeliverables } = useCampaignDeliverables(campaignId)
  const { data: allDeliverables, isLoading: loadingAllDeliverables } = useDeliverables()
  const applyMutation = useApplyToCampaign()
  const [activeTab, setActiveTab] = useState<'brief' | 'videos'>(
    initialTab === 'videos' ? 'videos' : 'brief'
  )
  // Accepted creators open straight into their WORK (Videos), not the sales pitch —
  // unless a deep link asked for a specific tab. Auto-switch fires once, then the
  // user owns the tab.
  const autoTabRef = useRef(false)
  useEffect(() => {
    if (autoTabRef.current || initialTab) return
    if (campaign?.creatorApplicationStatus === 'accepted') {
      autoTabRef.current = true
      setActiveTab('videos')
    }
  }, [campaign?.creatorApplicationStatus, initialTab])

  // Peak-moment brief walkthrough — auto-plays ONCE per campaign the first time
  // an accepted creator opens it; replayable from the Brief tab afterwards.
  const [briefIntroOpen, setBriefIntroOpen] = useState(false)
  const briefIntroCheckedRef = useRef(false)
  useEffect(() => {
    if (briefIntroCheckedRef.current || !campaignId) return
    if (campaign?.creatorApplicationStatus !== 'accepted') return
    briefIntroCheckedRef.current = true
    // NOTE: SecureStore keys only allow [A-Za-z0-9._-] — a ':' here made every
    // call reject silently and the walkthrough never auto-opened.
    const key = `brief_intro_seen_${campaignId}`
    SecureStore.getItemAsync(key)
      .then((seen) => {
        if (seen) return
        setTimeout(() => setBriefIntroOpen(true), 600)
        SecureStore.setItemAsync(key, '1').catch(() => {})
      })
      .catch(() => {})
  }, [campaign?.creatorApplicationStatus, campaignId])
  const [applySuccess, setApplySuccess] = useState(false)
  const [applyInfoId, setApplyInfoId] = useState<string | null>(null)
  const [termsOpen, setTermsOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const { width: winW } = useWindowDimensions()
  // Fallback until the gallery measures itself. The real paging width is the gallery
  // frame, which is narrower than winW-32 because of the bezel tray's padding/border —
  // using winW-32 for the pages misaligns every swiped image (#gallery-width).
  const heroWidth = winW - 32
  const [galleryWidth, setGalleryWidth] = useState(0)
  const pageWidth = galleryWidth || heroWidth
  const brandSheetRef = useRef<BottomSheetModal>(null)
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // The actual apply — runs after the Terms gate (if any) is accepted.
  const doApply = async () => {
    try {
      const { applicationId } = await applyMutation.mutateAsync(campaignId)
      setApplySuccess(true)
      toast.success('Application sent')
      // If the brand configured an after-apply form, collect it now (sizes etc.).
      if (campaign?.applyFormEnabled && campaign.applyForm) {
        setApplyInfoId(applicationId)
      }
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
    } catch {
      // Failure is surfaced centrally via the mutation's onError toast.
    }
  }

  const handleApply = async () => {
    if (profile?.reviewStatus !== 'approved') {
      toast.error('Your creator account must be approved before applying.')
      return
    }

    if (!isProfileComplete(profile)) {
      toast.error('Complete your profile before applying.')
      return
    }

    // Terms of Service gate — creator must accept before an application is created.
    setTermsOpen(true)
  }

  const hashtagText = useMemo(() => {
    const tags = campaign?.requiredHashtags?.length ? campaign.requiredHashtags : ['#annons']
    const hasLikelab = tags.some((t) => t.toLowerCase() === '#likelab')
    return hasLikelab ? tags : [...tags, '#LikeLab']
  }, [campaign?.requiredHashtags])
  // Work mode = a numbered to-do, not a document. Each step is an
  // imperative with only the material that step needs.
  const briefSteps: BriefStep[] = []
  if (campaign && currentApplicationStatus === 'accepted') {
    // Step 1: WHAT to talk about — the product and the brand's pitch.
    // Without this the rest of the steps have no substance.
    if (campaign.productDescription || campaign.description || campaign.briefGuidelines || campaign.productUrl) {
      briefSteps.push({
        key: 'know',
        title: "Know what you're promoting",
        content: (
          <View style={{ gap: 12 }}>
            {campaign.productDescription ? <ExpandableText text={campaign.productDescription} /> : null}
            {campaign.description ? <ExpandableText text={campaign.description} /> : null}
            {campaign.briefGuidelines ? <ExpandableText text={campaign.briefGuidelines} /> : null}
            {campaign.productUrl ? (
              <Pressable
                onPress={() => { haptic.selection(); openExternalUrl(campaign.productUrl!).catch(() => undefined) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', color: redesign.color.purple }}>View the product</Text>
                <MaterialCommunityIcons name="arrow-top-right" size={14} color={redesign.color.purple} />
              </Pressable>
            ) : null}
          </View>
        ),
      })
    }
    const styleLabels = (campaign.adStyles || []).map((k) => AD_STYLES[k]?.label).filter(Boolean)
    if (styleLabels.length > 0 || campaign.videoDirection || campaign.instructions || (campaign.exampleLinks || []).length > 0) {
      briefSteps.push({
        key: 'film',
        title: 'Film it',
        content: (
          <View style={{ gap: 12 }}>
            {styleLabels.length > 0 ? (
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '700', color: redesign.color.ink, letterSpacing: -0.2 }}>
                {styleLabels.join('  ·  ')}
              </Text>
            ) : null}
            {campaign.videoDirection ? <ExpandableText text={campaign.videoDirection} /> : null}
            {campaign.instructions ? <ExpandableText text={campaign.instructions} /> : null}
            {(campaign.exampleLinks || []).map((link, i) => (
              <Pressable
                key={link}
                onPress={() => { haptic.selection(); openExternalUrl(link).catch(() => undefined) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', color: redesign.color.purple }}>
                  {`Watch example ${(campaign.exampleLinks || []).length > 1 ? i + 1 : ''}`.trim()}
                </Text>
                <MaterialCommunityIcons name="arrow-top-right" size={14} color={redesign.color.purple} />
              </Pressable>
            ))}
          </View>
        ),
      })
    }
    if ((campaign.keyMessages || []).length > 0 || campaign.thingsToAvoid) {
      briefSteps.push({ key: 'rules', title: 'Nail the rules', content: <DosDontsBody campaign={campaign} /> })
    }
    if (hashtagText.length > 0) {
      briefSteps.push({
        key: 'post',
        title: 'Post with these hashtags',
        content: (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '700', color: redesign.color.ink, lineHeight: 22, letterSpacing: -0.2 }}>
              {hashtagText.join(' ')}
            </Text>
            <Pressable
              onPress={async () => {
                haptic.selection()
                await Clipboard.setStringAsync(hashtagText.join(' '))
                setCopiedTag('__all__')
                if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
                copiedTimerRef.current = setTimeout(() => setCopiedTag(null), 2000)
              }}
              accessibilityRole="button"
              accessibilityLabel="Copy hashtags"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.full, paddingHorizontal: 13, paddingVertical: 8, backgroundColor: copiedTag === '__all__' ? 'rgba(16,159,110,0.12)' : redesign.color.ink }}
            >
              <Text style={{ color: copiedTag === '__all__' ? redesign.color.successText : '#fff', fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '800' }}>
                {copiedTag === '__all__' ? 'Copied' : 'Copy'}
              </Text>
              <MaterialCommunityIcons name={copiedTag === '__all__' ? 'check' : 'content-copy'} size={12} color={copiedTag === '__all__' ? redesign.color.successText : '#fff'} />
            </Pressable>
          </View>
        ),
      })
    }
  }

  const visibleDeliverables = useMemo(() => {
    if ((campaignDeliverables || []).length) return campaignDeliverables || []
    return (allDeliverables || []).filter((item) => item.campaignId === campaignId)
  }, [allDeliverables, campaignDeliverables, campaignId])
  const daysLeft = getDaysLeft(campaign?.endDate)
  const closed = isCampaignClosed(campaign?.endDate)
  // Applications close on the deadline OR once the campaign leaves its live/application
  // state (paused/cancelled/completed, or a phase past application_period).
  const applicationsClosed =
    closed ||
    (!!campaign?.status && APPLICATION_CLOSED_STATUSES.has(campaign.status)) ||
    (!!campaign?.phase && APPLICATION_CLOSED_PHASES.has(campaign.phase))
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
    : applicationsClosed
    ? {
        label: 'Campaign closed',
        helper: 'This campaign is no longer accepting applications.',
        disabled: true,
        tone: 'secondary' as const,
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
      <Animated.View
        entering={FadeInUp.duration(420).delay(260)}
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
              {closed ? 'Closed' : daysLeft == null ? 'Open now' : daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
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

        <View style={{ marginBottom: 15 }}>
          {ctaState.disabled ? (
            <LiquidButton
              label={ctaState.label}
              disabled
              minHeight={54}
              borderRadius={20}
              tone={ctaState.tone === 'success' ? 'success' : ctaState.tone === 'secondary' ? 'neutral' : 'primary'}
              icon={ctaState.tone === 'success' ? <MaterialCommunityIcons name="check-circle" size={18} color="#0F9F6E" /> : undefined}
            />
          ) : (
            <HoldToApplyButton label={ctaState.label} onComplete={handleApply} minHeight={54} />
          )}
        </View>

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
      </Animated.View>
    </View>
  ) : null

  useEffect(() => {
    // Don't clobber the accepted-creator auto-switch to Videos: on a warm-cache mount
    // that effect runs first in the same commit and latches autoTabRef, and this reset
    // (dep [initialTab] never changes) would otherwise win and wedge them on Brief.
    if (autoTabRef.current) return
    setActiveTab(initialTab === 'videos' ? 'videos' : 'brief')
  }, [initialTab])

  useEffect(() => () => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
  }, [])

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

  return (
    <>
      <BriefWalkthrough
        visible={briefIntroOpen}
        onClose={() => setBriefIntroOpen(false)}
        steps={briefSteps}
        campaignTitle={campaign?.title}
      />
      <ApplyInfoSheet
        visible={!!applyInfoId}
        form={campaign?.applyForm ?? null}
        applicationId={applyInfoId}
        brandName={campaign?.brandName}
        onClose={() => setApplyInfoId(null)}
      />
      <TermsSheet
        visible={termsOpen}
        onAccept={() => { setTermsOpen(false); void doApply() }}
        onClose={() => setTermsOpen(false)}
      />
      <BrandSheet
        ref={brandSheetRef}
        data={campaign ? {
          brandName: campaign.brandName,
          brandLogoUrl: campaign.brandLogoUrl,
          brandInstagram: campaign.brandInstagram,
          brandTiktok: campaign.brandTiktok,
        } : null}
      />
      <Screen tabAware={false} overlay={stickyBar} overlayPadding={150} scrollRef={scrollRef} bgColor={redesign.color.bg} scrollOffsetY={scrollY}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={palette.textMuted} />
          <Text style={{ color: palette.textMuted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back to campaigns</Text>
        </Pressable>
      </Animated.View>

      {isLoading && !campaign ? (
        <View style={{ gap: 16, marginTop: 8 }}>
          {/* Hero card placeholder */}
          <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong }}>
            <Bone width="100%" height={HERO_H} borderRadius={0} />
            <View style={{ padding: 16, gap: 10 }}>
              <Bone width="80%" height={22} />
              <Bone width="45%" height={13} />
            </View>
          </View>
          {/* Tab bar + content placeholders */}
          <Bone width="100%" height={52} borderRadius={16} />
          <Bone width="100%" height={120} borderRadius={20} />
          <Bone width="100%" height={88} borderRadius={18} />
        </View>
      ) : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load this campaign.</Text> : null}

      {campaign ? (
        <>
          <Animated.View entering={FadeInDown.springify().damping(17).stiffness(150).mass(0.9).delay(40)}>
            <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.card, ...redesign.shadow.card }}>
              {/* Image gallery — taller and unobscured so the campaign photo is the hero */}
              <View
                style={{ height: HERO_H, backgroundColor: '#EDEBE6' }}
                onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View style={[{ flex: 1 }, heroZoomStyle]}>
                {/* Swipeable image gallery (Tradera-style) */}
                {heroImages.length > 1 ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth)
                      if (i !== activeImage) setActiveImage(i)
                    }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {heroImages.map((uri, i) => (
                      <ExpoImage
                        key={`${uri}-${i}`}
                        source={{ uri }}
                        style={{ width: pageWidth, height: HERO_H }}
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
                ) : (
                  <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="image-outline" size={40} color={redesign.color.faint} />
                  </View>
                )}

                {/* Light top scrim — only enough to keep the brand chip + counter legible */}
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.28)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 96 }}
                />

                {/* Brand chip top-left */}
                <Pressable
                  style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingLeft: 4, paddingRight: 11, paddingVertical: 4 }}
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

                {/* Pagination dots — short bottom scrim keeps them visible on light photos */}
                {heroImages.length > 1 ? (
                  <>
                    <LinearGradient
                      pointerEvents="none"
                      colors={['transparent', 'rgba(0,0,0,0.30)']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 44 }}
                    />
                    <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                      {heroImages.map((_, i) => (
                        <View
                          key={i}
                          style={{ width: i === activeImage ? 16 : 6, height: 6, borderRadius: 999, backgroundColor: i === activeImage ? '#fff' : 'rgba(255,255,255,0.6)' }}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
                </Animated.View>
              </View>

              {/* Title block — below the image so the photo stays fully visible and the
                  heading sits on a clean surface (calmer than white-on-dark-scrim) */}
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 9 }}>
                <Text style={{ color: redesign.color.ink, fontSize: 25, fontWeight: '800', lineHeight: 30, letterSpacing: -0.8, fontFamily: typography.fontFamily }} numberOfLines={3}>
                  {campaign.title}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Staggered entrance: hero lands first (delay 80), then the tab switcher —
              reads as one continuous motion from the tapped card. */}
          <Animated.View entering={FadeInDown.springify().damping(17).stiffness(150).mass(0.9).delay(150)} style={{ flexDirection: 'row', gap: 6, padding: 5, borderRadius: 16, backgroundColor: '#ECEAE4' }}>
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
              { key: 'videos', icon: 'video-outline', label: campaign.requiredVideos ? `Videos ${visibleDeliverables.length}/${campaign.requiredVideos}` : `Videos · ${visibleDeliverables.length}` },
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
          </Animated.View>

          {activeTab === 'brief' && (
            <Animated.View key="tab-brief" entering={FadeInDown.duration(300).delay(90)} style={{ gap: spacing.lg }}>
              {/* Five-second summary — the only thing a lazy creator must see */}
              {(() => {
                const urgent = !closed && daysLeft != null && daysLeft <= 3
                const accepted = currentApplicationStatus === 'accepted'
                const glanceRows: GlanceRow[] = []
                // Pre-accept the glance is the decision (get / make / when); once
                // accepted those are settled — only the deadline still matters here,
                // the Videos tab owns the work progress.
                if (!accepted) {
                  if (campaign.productAmount || formatRewardType(campaign)) {
                    glanceRows.push({
                      label: 'You get',
                      icon: 'gift-outline',
                      value: campaign.productAmount
                        ? `${campaign.productAmount} × product to keep`
                        : formatRewardType(campaign) || 'Reward',
                    })
                  }
                  if (campaign.requiredVideos) {
                    glanceRows.push({ label: 'You make', icon: 'video-outline', value: `${campaign.requiredVideos} TikTok ${campaign.requiredVideos === 1 ? 'video' : 'videos'}` })
                  }
                }
                // V2 campaigns have no end_date (yet) — skip the row instead of an
                // eternal "Open now".
                if (campaign.endDate) {
                  glanceRows.push({
                    label: 'Deadline',
                    icon: urgent ? 'clock-alert-outline' : 'clock-outline',
                    urgent,
                    value: closed ? 'Closed' : daysLeft == null ? 'Open now' : daysLeft === 0 ? 'Last day' : `${daysLeft} days left`,
                  })
                }
                return <CampaignGlance rows={glanceRows} />
              })()}

              {/* Everything else is opt-in: collapsed rows, one-line teasers */}
              {(() => {
                // Decision mode vs work mode. Either way this is ONE flat document —
                // no dropdowns to operate; long text folds behind Read more.
                const unlocked = currentApplicationStatus === 'accepted'
                const sections: BriefDocSection[] = []

                if (!unlocked && (campaign.productDescription || campaign.productUrl || campaign.productAmount)) {
                  sections.push({ key: 'product', label: 'The product', content: <ProductBody campaign={campaign} /> })
                }

                if (!unlocked && (campaign.campaignGoal || campaign.description || campaign.briefGuidelines)) {
                  sections.push({
                    key: 'about',
                    label: 'About the campaign',
                    content: (
                      <View style={{ gap: 12 }}>
                        {campaign.campaignGoal ? (
                          <Text style={{ fontSize: 15.5, color: redesign.color.ink, lineHeight: 22, fontWeight: '700', letterSpacing: -0.3, fontFamily: typography.fontFamily }}>
                            {formatCampaignGoal(campaign.campaignGoal)}
                          </Text>
                        ) : null}
                        {campaign.description ? <ExpandableText text={campaign.description} /> : null}
                        {campaign.briefGuidelines ? <ExpandableText text={campaign.briefGuidelines} /> : null}
                      </View>
                    ),
                  })
                }

                return (
                  <>
                    {unlocked ? (
                      <>
                        <BriefAccordion items={briefSteps} />
                        <Pressable
                          onPress={() => { haptic.selection(); setBriefIntroOpen(true) }}
                          accessibilityRole="button"
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10 }}
                        >
                          <MaterialCommunityIcons name="play-circle-outline" size={16} color={redesign.color.purple} />
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', color: redesign.color.purple }}>Replay walkthrough</Text>
                        </Pressable>
                      </>
                    ) : (
                      <BriefDocument sections={sections} />
                    )}
                    {!unlocked ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 2 }}>
                        <MaterialCommunityIcons name="lock-outline" size={14} color={redesign.color.faint} />
                        <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.faint, lineHeight: 17 }}>
                          {"Film guide, hashtags and rules unlock when you're accepted."}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )
              })()}
            </Animated.View>
          )}

          {activeTab === 'videos' ? (
            <Animated.View key="tab-videos" entering={FadeInDown.duration(300).delay(90)} onLayout={(e) => { videosY.current = e.nativeEvent.layout.y }}>
              {loadingDeliverables || loadingAllDeliverables ? <ActivityIndicator color={colors.primary} /> : null}

              {visibleDeliverables.length > 0 ? (() => {
                const total = visibleDeliverables.length
                // Tier-aware, matching the grid below: standard/direct-delivery
                // campaigns collapse to a single "deliver" (post on TikTok) step, so
                // the progress card must not show review-flow "Upload" copy for them.
                const stages = visibleDeliverables.map((d) => resolveStage(d, campaign?.requiresReview ?? true))
                const submitted = stages.filter((s) => s === 'under_review' || s === 'submit_link' || s === 'live').length
                const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
                const nextIdx = stages.findIndex((s) => STAGE_UI[s].actionable)
                const nextLabel =
                  nextIdx === -1
                    ? 'All caught up'
                    : stages[nextIdx] === 'upload'
                      ? `Upload Video ${nextIdx + 1}`
                      : stages[nextIdx] === 'revision'
                        ? `Re-upload Video ${nextIdx + 1}`
                        : `Post Video ${nextIdx + 1} on TikTok`
                return (
                  <Animated.View
                    entering={FadeInDown.duration(400)}
                    style={{ marginBottom: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}
                  >
                    <View style={{ padding: 20, gap: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                            Your progress
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 5 }}>
                            <CountUp
                              value={submitted}
                              duration={650}
                              style={{ fontFamily: typography.fontFamily, fontSize: 42, fontWeight: '900', color: redesign.color.ink, letterSpacing: -2, lineHeight: 44, padding: 0, minWidth: 26 }}
                            />
                            <Text style={{ fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '700', color: redesign.color.faint }}>
                              {`of ${total} submitted`}
                            </Text>
                          </View>
                        </View>
                        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] }}>{`${pct}%`}</Text>
                        </View>
                      </View>
                      <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999, backgroundColor: redesign.color.purple }} />
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: nextIdx === -1 ? redesign.color.successBg : 'rgba(99,80,184,0.10)', borderRadius: 999, paddingLeft: 9, paddingRight: 14, paddingVertical: 8 }}>
                        <MaterialCommunityIcons name={nextIdx === -1 ? 'check-circle' : 'arrow-right-circle'} size={16} color={nextIdx === -1 ? redesign.color.successText : redesign.color.purple} />
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '800', color: nextIdx === -1 ? redesign.color.successText : redesign.color.purple, letterSpacing: -0.1 }}>
                          {nextIdx === -1 ? 'All caught up — nothing to do' : `Next: ${nextLabel}`}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                )
              })() : null}

              {visibleDeliverables.length === 0 ? (
                !loadingDeliverables && !loadingAllDeliverables ? (
                  <EmptyState title="No Videos Yet" subtitle="Assigned deliverables will appear in this tab." icon="video-outline" />
                ) : null
              ) : (
                <CampaignVideoGrid
                  deliverables={visibleDeliverables}
                  brandName={campaign?.brandName}
                  brandLogoUrl={campaign?.brandLogoUrl}
                  requiresReview={campaign?.requiresReview ?? true}
                />
              )}
            </Animated.View>
          ) : null}

        </>
      ) : null}
    </Screen>
    </>
  )
}
