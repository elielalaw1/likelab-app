import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, ImageBackground, Linking, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { formatCampaignGoal, formatDateRange, getDaysLeft, looksLikeTikTokUrl } from '@/features/core/format'
import { colors, palette, radii, shadows, typography } from '@/features/core/theme'
import { useApplyToCampaign, useCampaign, useCampaignDeliverables } from '@/features/campaigns/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { useCreatorProfile } from '@/features/profile/hooks'
import { DeliverableInputRow } from '@/features/shared/ui/DeliverableInputRow'
import { useDeliverables, useSubmitLink } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { BrandAvatar } from '@/features/shared/ui/BrandAvatar'
import { toast } from '@/features/shared/ui/Toast'

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
  borderColor,
  children,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  tint: string
  borderColor?: string
  children: ReactNode
}) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 28,
        padding: 22,
        borderWidth: 1,
        borderColor: borderColor || 'rgba(234,236,239,0.9)',
        gap: 18,
        ...shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tint,
          }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={colors.foreground} />
        </View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: typography.fontFamily,
            fontWeight: '700',
            fontSize: 11,
            letterSpacing: 1.1,
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


function Pill({ label, backgroundColor, color }: { label: string; backgroundColor: string; color: string }) {
  return (
    <View style={{ borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 10, backgroundColor }}>
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

export default function CampaignDetailPage() {
  const params = useLocalSearchParams<{ id: string; tab?: string }>()
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab

  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  const { data: profile } = useCreatorProfile()
  const { data: campaignDeliverables, isLoading: loadingDeliverables, refetch: refetchCampaignDeliverables } = useCampaignDeliverables(campaignId)
  const { data: allDeliverables, isLoading: loadingAllDeliverables, refetch: refetchAllDeliverables } = useDeliverables()
  const applyMutation = useApplyToCampaign()
  const submitLinkMutation = useSubmitLink()
  const [activeTab, setActiveTab] = useState<'description' | 'brief' | 'videos'>(
    initialTab === 'videos' ? 'videos' : initialTab === 'brief' ? 'brief' : 'description'
  )
  const [deliverableInputs, setDeliverableInputs] = useState<Record<string, string>>({})
  const [leaderboard, setLeaderboard] = useState<{ rank: number; total_creators: number; my_views: number; my_likes: number; top_views: number } | null>(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [tabMetrics, setTabMetrics] = useState<Record<'description' | 'brief' | 'videos', { x: number; width: number }>>({
    description: { x: 0, width: 0 },
    brief: { x: 0, width: 0 },
    videos: { x: 0, width: 0 },
  })
  const bubbleLeft = useSharedValue(-100)
  const bubbleWidth = useSharedValue(0)
  const bubbleScale = useSharedValue(1)
  const bubbleInitialized = useRef(false)

  const profileComplete = profile ? isProfileComplete(profile) : false
  const canApply = Boolean(profile?.reviewStatus === 'approved' && profileComplete)
  const currentApplicationStatus = campaign?.creatorApplicationStatus || null
  const applyBlockedByStatus = currentApplicationStatus === 'applied' || currentApplicationStatus === 'accepted'
  const uploadedCount = (campaignDeliverables || []).filter((item) => item.status === 'uploaded' || item.status === 'published').length

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
    } catch (applyError) {
      toast.error(applyError instanceof Error ? applyError.message : 'Could not apply')
    }
  }

  const submitCampaignDeliverable = async (deliverableId: string) => {
    const value = (deliverableInputs[deliverableId] || '').trim()
    if (!value) {
      toast.error('Please paste a TikTok URL first.')
      return
    }
    if (!looksLikeTikTokUrl(value)) {
      toast.error('Only TikTok URLs are accepted.')
      return
    }

    try {
      await submitLinkMutation.mutateAsync({ deliverableId, url: value })
      toast.success('Deliverable submitted!')
      setDeliverableInputs((prev) => ({ ...prev, [deliverableId]: '' }))
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Could not submit deliverable')
    }
  }

  const hashtagText = useMemo(() => campaign?.requiredHashtags || ['#annons'], [campaign?.requiredHashtags])
  const visibleDeliverables = useMemo(() => {
    if ((campaignDeliverables || []).length) return campaignDeliverables || []
    return (allDeliverables || []).filter((item) => item.campaignId === campaignId)
  }, [allDeliverables, campaignDeliverables, campaignId])
  const primaryPlatform = campaign?.platforms?.[0] || visibleDeliverables?.[0]?.platform || 'TikTok'
  const daysLeft = getDaysLeft(campaign?.endDate)
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
              label: currentApplicationStatus === 'rejected' || currentApplicationStatus === 'withdrawn' ? 'Apply again' : 'Apply now',
              helper: 'Send your application directly from this campaign workspace.',
              disabled: false,
              tone: 'primary' as const,
            }

  const stickyBar = campaign && currentApplicationStatus !== 'accepted' ? (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 12,
      }}
    >
      <View
        style={{
          borderRadius: 28,
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderWidth: 1,
          borderColor: ctaState.tone === 'success' ? 'rgba(167,243,208,0.95)' : 'rgba(234,236,239,0.85)',
          padding: 16,
          gap: 14,
          ...shadows.hero,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', letterSpacing: 1.05, textTransform: 'uppercase' }}>
              Ready to apply
            </Text>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
              {daysLeft == null ? 'Campaign is open now' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', letterSpacing: 1.05, textTransform: 'uppercase' }}>
              Required videos
            </Text>
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
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
        />

        <View style={{ gap: 8 }}>
          <Text style={{ color: palette.textMuted, fontSize: 12, lineHeight: 18, fontFamily: typography.fontFamily }}>
            {ctaState.helper}
          </Text>
          {!profileComplete && profile?.reviewStatus === 'approved' ? (
            <Pressable onPress={() => router.push('/settings')}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily }}>
                Complete profile
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  ) : null

  useEffect(() => {
    if (!campaignId) return
    supabase.rpc('get_campaign_leaderboard_position', { p_campaign_id: campaignId }).then(({ data }) => {
      if (data && data.length > 0) setLeaderboard(data[0])
    })
  }, [campaignId])

  useEffect(() => {
    setActiveTab(initialTab === 'videos' ? 'videos' : initialTab === 'brief' ? 'brief' : 'description')
  }, [initialTab])

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
    bubbleLeft.value = withSpring(metric.x + inset, { damping: 18, stiffness: 210, mass: 0.7 })
    bubbleWidth.value = withSpring(Math.max(0, metric.width - inset * 2), { damping: 18, stiffness: 210, mass: 0.7 })
    bubbleScale.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 180 }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const tabBubbleStyle = useAnimatedStyle(() => ({
    left: bubbleLeft.value,
    width: bubbleWidth.value,
    transform: [{ scale: bubbleScale.value }],
  }))

  return (
    <Screen tabAware={false} overlay={stickyBar} overlayPadding={176}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={palette.textMuted} />
          <Text style={{ color: palette.textMuted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back to campaigns</Text>
        </Pressable>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load this campaign.</Text> : null}

      {campaign ? (
        <>
          <Animated.View entering={FadeInDown.duration(250).delay(80)}>
            <View style={{ borderRadius: 34, overflow: 'hidden', backgroundColor: '#0E0A1C', ...shadows.hero }}>
              <ImageBackground
                source={campaign.coverImageUrl ? { uri: campaign.coverImageUrl } : undefined}
                style={{ height: 380, backgroundColor: '#1A0F2E' }}
              >
                {/* Top fade for badge readability */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.52)', 'transparent']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.38 }}
                  style={{ position: 'absolute', inset: 0 }}
                />
                {/* Bottom fade for text readability */}
                <LinearGradient
                  colors={['transparent', 'rgba(8,4,18,0.96)']}
                  start={{ x: 0.5, y: 0.38 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', inset: 0 }}
                />

                {/* Top row: status badge + reward pill */}
                <View style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <StatusBadge status={campaign.creatorApplicationStatus || campaign.status} />
                  {campaign.rewardType ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: typography.fontFamily }}>
                        {campaign.rewardType}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Bottom content */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BrandAvatar logoUrl={campaign.brandLogoUrl} brandName={campaign.brandName} size={22} />
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', fontFamily: typography.fontFamily }}>
                      {campaign.brandName || 'Brand'}
                    </Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 35, letterSpacing: -0.7, fontFamily: typography.fontFamily }}>
                    {campaign.title}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="web" size={13} color="rgba(255,255,255,0.5)" />
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>
                        {formatPlatform(primaryPlatform)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="calendar-month-outline" size={13} color="rgba(255,255,255,0.5)" />
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>
                        {formatDateRange(campaign.startDate, campaign.endDate) || '-'}
                      </Text>
                    </View>
                    {campaign.requiredVideos ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MaterialCommunityIcons name="video-outline" size={13} color="rgba(255,255,255,0.5)" />
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>
                          {campaign.requiredVideos} videos
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </ImageBackground>
            </View>
          </Animated.View>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              padding: 8,
              borderRadius: 26,
              backgroundColor: 'rgba(248,250,252,0.56)',
              borderWidth: 1,
              borderColor: 'rgba(15,23,42,0.08)',
              shadowColor: '#0F172A',
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
              overflow: 'hidden',
            }}
          >
            <BlurView tint="light" intensity={64} style={{ position: 'absolute', inset: 0 }} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(248,250,252,0.68)', 'rgba(255,255,255,0.52)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.4 }}
              style={{ position: 'absolute', left: 1, right: 1, top: 1, height: 18, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.06)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 9,
                  height: 60,
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.86)',
                  shadowColor: 'rgba(109,40,217,1)',
                  shadowOpacity: 0.18,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 4 },
                },
                tabBubbleStyle,
              ]}
            >
              <BlurView tint="light" intensity={48} style={{ position: 'absolute', inset: 0 }} />
              <LinearGradient
                colors={['rgba(255,255,255,0.72)', 'rgba(239,233,255,0.52)', 'rgba(228,246,255,0.32)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ flex: 1, borderRadius: 20 }}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
                start={{ x: 0.08, y: 0.02 }}
                end={{ x: 0.88, y: 0.72 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 20 }}
              />
              <LinearGradient
                colors={['rgba(139,92,246,0.16)', 'rgba(56,189,248,0.1)', 'rgba(255,255,255,0.02)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0, borderRadius: 20 }}
              />
            </Animated.View>
            {([
              { key: 'description', icon: 'target', label: 'Description' },
              { key: 'brief', icon: 'file-document-outline', label: 'Brief' },
              { key: 'videos', icon: 'video-outline', label: `Videos (${campaignDeliverables?.length ?? 0}/${campaign.requiredVideos ?? 0})` },
            ] as const).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout
                  setTabMetrics((prev) => (prev[tab.key].x === x && prev[tab.key].width === width ? prev : { ...prev, [tab.key]: { x, width } }))
                }}
                style={{ flex: 1, minHeight: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <MaterialCommunityIcons name={tab.icon} size={20} color={activeTab === tab.key ? palette.text : palette.textMuted} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', color: activeTab === tab.key ? palette.text : palette.textMuted, textAlign: 'center' }}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'description' && (
            <>
              {campaign.campaignGoal ? (
                <Section icon="target" title="Campaign Goal" tint="rgba(139,92,246,0.14)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {formatCampaignGoal(campaign.campaignGoal)}
                  </Text>
                </Section>
              ) : null}
              {campaign.preferredCreators ? (
                <Section icon="account-star-outline" title="Preferred Creators" tint="rgba(251,113,133,0.14)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {campaign.preferredCreators}
                  </Text>
                </Section>
              ) : null}
              {campaign.description ? (
                <Section icon="text-box-outline" title="Product Description" tint="rgba(96,165,250,0.14)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {campaign.description}
                  </Text>
                </Section>
              ) : null}
            </>
          )}

          {activeTab === 'brief' && (
            <>
              {campaign.videoRequirements ? (
                <Section icon="video-outline" title="Video Requirements" tint="rgba(251,113,133,0.14)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {campaign.videoRequirements}
                  </Text>
                </Section>
              ) : null}
              {campaign.instructions ? (
                <Section icon="pencil-outline" title="Your Instructions" tint="rgba(96,165,250,0.16)" borderColor="rgba(167,243,208,0.9)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {campaign.instructions}
                  </Text>
                </Section>
              ) : null}
              {campaign.brandVoice ? (
                <Section icon="account-voice" title="Brand Voice" tint="rgba(45,212,191,0.14)">
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                    {campaign.brandVoice}
                  </Text>
                </Section>
              ) : null}
              {hashtagText.length > 0 ? (
                <Section icon="pound" title="Required Hashtags" tint="rgba(139,92,246,0.14)">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {hashtagText.map((tag, i) => (
                      <Pill key={`${tag}-${i}`} label={tag} backgroundColor="rgba(139,92,246,0.14)" color="#6D28D9" />
                    ))}
                  </View>
                </Section>
              ) : null}
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
            </>
          )}

          {activeTab === 'videos' ? (
            <>
              {loadingDeliverables || loadingAllDeliverables ? <ActivityIndicator color={colors.primary} /> : null}

              {leaderboard ? (
                <Animated.View entering={FadeInDown.delay(100).duration(400)}>
                  {(() => {
                    const medal = MEDAL[leaderboard.rank] || { bg: '#f1f5f9', text: colors.mutedForeground }
                    const pct = leaderboard.top_views > 0 ? Math.max(4, (leaderboard.my_views / leaderboard.top_views) * 100) : 4
                    const barColor = leaderboard.rank === 1 ? '#f59e0b' : '#6366f1'
                    return (
                      <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(234,236,239,0.5)', backgroundColor: 'rgba(255,255,255,0.92)', gap: 12, ...shadows.card }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: medal.bg, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '800', fontSize: 16, color: medal.text }}>#{leaderboard.rank}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 14, color: palette.text }}>Your Position</Text>
                            <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: palette.textMuted, marginTop: 1 }}>
                              #{leaderboard.rank} of {leaderboard.total_creators} creators
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: palette.text, fontWeight: '600' }}>{fmtNum(leaderboard.my_views)} views</Text>
                          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, color: palette.textMuted }}>Leader: {fmtNum(leaderboard.top_views)}</Text>
                        </View>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 4 }} />
                        </View>
                      </View>
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
                      <StatusBadge status={item.status} />
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
                      <DeliverableInputRow
                        value={deliverableInputs[item.id] ?? item.url ?? ''}
                        onChangeText={(text) => setDeliverableInputs((prev) => ({ ...prev, [item.id]: text }))}
                        onSubmit={() => submitCampaignDeliverable(item.id)}
                        loading={submitLinkMutation.isPending}
                        submitLabel={item.status === 'revision_requested' ? 'Re-submit' : 'Submit'}
                      />
                    ) : item.url ? (
                      <Pressable
                        onPress={() => Linking.openURL(item.url || '').catch(() => undefined)}
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(234,236,239,0.9)',
                          backgroundColor: '#fff',
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
                    ) : (
                      <Text style={{ color: palette.textMuted, fontSize: 13, fontFamily: typography.fontFamily }}>No URL submitted yet.</Text>
                    )}
                  </Section>
                )}
              />
            </>
          ) : null}

        </>
      ) : null}
    </Screen>
  )
}
