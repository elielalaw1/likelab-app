import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, ImageBackground, Linking, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
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
import { useDeliverables, useSubmissionStatus, useSubmitLink, useUploadVideo } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

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

function StatCell({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View
      style={{
        width: '50%',
        minHeight: 112,
        paddingHorizontal: 18,
        paddingVertical: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        {label}
      </Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontFamily: typography.fontFamily }}>{value}</Text>
        <MaterialCommunityIcons name={icon} size={18} color="rgba(255,255,255,0.36)" />
      </View>
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
  const videoUpload = useUploadVideo()
  const [activeTab, setActiveTab] = useState<'brief' | 'videos'>(initialTab === 'videos' ? 'videos' : 'brief')
  const [deliverableInputs, setDeliverableInputs] = useState<Record<string, string>>({})
  const [applySuccess, setApplySuccess] = useState(false)
  const [activeUploadDeliverableId, setActiveUploadDeliverableId] = useState<string | null>(null)
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)
  const [tabMetrics, setTabMetrics] = useState<Record<'brief' | 'videos', { x: number; width: number }>>({
    brief: { x: 0, width: 0 },
    videos: { x: 0, width: 0 },
  })
  const bubbleX = useSharedValue(0)
  const bubbleWidth = useSharedValue(0)
  const bubbleScale = useSharedValue(1)
  const { data: submissionStatus } = useSubmissionStatus(activeSubmissionId || undefined)

  const profileComplete = profile ? isProfileComplete(profile) : false
  const canApply = Boolean(profile?.reviewStatus === 'approved' && profileComplete)
  const currentApplicationStatus = campaign?.creatorApplicationStatus || null
  const applyBlockedByStatus = currentApplicationStatus === 'applied' || currentApplicationStatus === 'accepted'
  const uploadedCount = (campaignDeliverables || []).filter((item) => item.status === 'uploaded' || item.status === 'published').length

  const handleApply = async () => {
    if (profile?.reviewStatus !== 'approved') {
      Alert.alert('Approval required', 'Creators cannot apply unless review_status is approved.')
      return
    }

    if (!isProfileComplete(profile)) {
      Alert.alert('Profile incomplete', 'Profile completion must be 100% before applying.')
      return
    }

    try {
      await applyMutation.mutateAsync(campaignId)
      setApplySuccess(true)
    } catch (applyError) {
      Alert.alert('Apply failed', applyError instanceof Error ? applyError.message : 'Could not apply')
    }
  }

  const submitCampaignDeliverable = async (deliverableId: string) => {
    const value = (deliverableInputs[deliverableId] || '').trim()
    if (!value) {
      Alert.alert('Missing URL', 'Please paste a TikTok URL first.')
      return
    }
    if (!looksLikeTikTokUrl(value)) {
      Alert.alert('Invalid URL', 'Deliverables only accept TikTok URLs.')
      return
    }

    try {
      await submitLinkMutation.mutateAsync({ deliverableId, url: value })
      Alert.alert('Success', 'Deliverable submitted.')
      setDeliverableInputs((prev) => ({ ...prev, [deliverableId]: '' }))
    } catch (submitError) {
      Alert.alert('Submission failed', submitError instanceof Error ? submitError.message : 'Could not submit deliverable')
    }
  }

  const submitCampaignVideo = async (deliverableId: string) => {
    try {
      const { pickVideoFromLibrary } = await import('@/lib/video-picker')
      const picked = await pickVideoFromLibrary()
      if (!picked) return

      videoUpload.reset()
      setActiveUploadDeliverableId(deliverableId)
      const submission = await videoUpload.upload({
        deliverableId,
        videoUri: picked.uri,
        fileName: picked.fileName,
        fileSize: picked.fileSize,
        mimeType: picked.mimeType,
        compressionOptions: { quality: 'medium' },
      })
      setActiveSubmissionId(submission.id)
    } catch (uploadError) {
      setActiveUploadDeliverableId(deliverableId)
      Alert.alert('Upload failed', uploadError instanceof Error ? uploadError.message : 'Could not upload video')
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
    setActiveTab(initialTab === 'videos' ? 'videos' : 'brief')
  }, [initialTab])

  useEffect(() => {
    const metric = tabMetrics[activeTab]
    if (!metric?.width) return

    const inset = 1
    bubbleX.value = withSpring(metric.x + inset, {
      damping: 18,
      stiffness: 210,
      mass: 0.7,
    })
    bubbleWidth.value = withSpring(Math.max(0, metric.width - inset * 2), {
      damping: 18,
      stiffness: 210,
      mass: 0.7,
    })
    bubbleScale.value = withSequence(withTiming(1.04, { duration: 120 }), withTiming(1, { duration: 180 }))
  }, [activeTab, bubbleScale, bubbleWidth, bubbleX, tabMetrics])

  useEffect(() => {
    if (!submissionStatus) return

    if (submissionStatus.status === 'submitted') {
      videoUpload.markDone()
      refetchCampaignDeliverables()
      refetchAllDeliverables()
      setActiveSubmissionId(null)
      setActiveUploadDeliverableId(null)
    }

    if (submissionStatus.status === 'failed') {
      videoUpload.markFailed(submissionStatus.errorMessage || 'Video processing failed')
      setActiveSubmissionId(null)
    }
  }, [refetchAllDeliverables, refetchCampaignDeliverables, submissionStatus, videoUpload])

  const tabBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleX.value }, { scale: bubbleScale.value }],
    width: bubbleWidth.value,
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
            <View style={{ borderRadius: 34, overflow: 'hidden', backgroundColor: '#170F2B', ...shadows.hero }}>
              <ImageBackground source={campaign.coverImageUrl ? { uri: campaign.coverImageUrl } : undefined} style={{ minHeight: 340, backgroundColor: '#2A1538' }}>
                <LinearGradient
                  colors={['rgba(32,14,53,0.24)', 'rgba(92,12,74,0.48)', 'rgba(14,16,30,0.88)']}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{ flex: 1 }}
                >
                  <View style={{ padding: 24, gap: 14 }}>
                    <StatusBadge status={campaign.creatorApplicationStatus || campaign.status} />
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.6, fontFamily: typography.fontFamily }}>
                      {campaign.title}
                    </Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="storefront-outline" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={{ color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '600', fontFamily: typography.fontFamily }}>
                          {campaign.brandName || 'Brand'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={{ color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '600', fontFamily: typography.fontFamily }}>
                          {formatDateRange(campaign.startDate, campaign.endDate) || '-'}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 20, fontFamily: typography.fontFamily }} numberOfLines={3}>
                      {campaign.description || campaign.campaignGoal || 'Campaign details'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <StatCell label="Videos" value={`${uploadedCount}/${campaign.requiredVideos || 0}`} icon="video-outline" />
                    <StatCell label="Platform" value={formatPlatform(primaryPlatform)} icon="web" />
                    <StatCell label="Days Left" value={daysLeft == null ? '-' : String(daysLeft)} icon="clock-outline" />
                    <StatCell label="Timeline" value={formatDateRange(campaign.startDate, campaign.endDate) || '-'} icon="calendar-range" />
                  </View>
                </LinearGradient>
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
                  top: 6,
                  left: 0,
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
            <Pressable
              onPress={() => setActiveTab('brief')}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout
                setTabMetrics((prev) => (prev.brief.x === x && prev.brief.width === width ? prev : { ...prev, brief: { x, width } }))
              }}
              style={{
                flex: 1,
                minHeight: 58,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons name="file-document-outline" size={20} color={activeTab === 'brief' ? palette.text : palette.textMuted} />
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: activeTab === 'brief' ? palette.text : palette.textMuted }}>
                Campaign Brief
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('videos')}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout
                setTabMetrics((prev) => (prev.videos.x === x && prev.videos.width === width ? prev : { ...prev, videos: { x, width } }))
              }}
              style={{
                flex: 1,
                minHeight: 58,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              <MaterialCommunityIcons name="video-outline" size={20} color={activeTab === 'videos' ? palette.text : palette.textMuted} />
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: activeTab === 'videos' ? palette.text : palette.textMuted }}>
                Your Videos {campaignDeliverables?.length ? `(${campaignDeliverables.length})` : ''}
              </Text>
            </Pressable>
          </View>

          {activeTab === 'brief' ? (
            <>
              <Section icon="target" title="Campaign Goal" tint="rgba(139,92,246,0.14)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {formatCampaignGoal(campaign.campaignGoal) || '-'}
                </Text>
              </Section>

              <Section icon="creation-outline" title="Your Instructions" tint="rgba(16,185,129,0.16)" borderColor="rgba(167,243,208,0.9)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.instructions || '-'}
                </Text>
              </Section>

              <Section icon="text-box-check-outline" title="Brand Voice" tint="rgba(96,165,250,0.16)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.brandVoice || '-'}
                </Text>
              </Section>

              <Section icon="palette-outline" title="Brand Tone" tint="rgba(251,113,133,0.16)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.brandTone || '-'}
                </Text>
              </Section>

              <Section icon="account-group-outline" title="Target Audience" tint="rgba(34,211,238,0.16)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.targetAudience || '-'}
                </Text>
              </Section>

              <Section icon="web" title="Platforms" tint="rgba(96,165,250,0.18)">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {(campaign.platforms || []).length ? (
                    campaign.platforms?.map((platform) => (
                      <Pill key={platform} label={formatPlatform(platform)} backgroundColor="rgba(59,130,246,0.16)" color="#1D4ED8" />
                    ))
                  ) : (
                    <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>-</Text>
                  )}
                </View>
              </Section>

              <Section icon="message-text-outline" title="Key Messages" tint="rgba(168,85,247,0.14)">
                {(campaign.keyMessages || []).length ? (
                  <View style={{ gap: 14 }}>
                    {campaign.keyMessages?.map((message, index) => (
                      <View key={`${message}-${index}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(139,92,246,0.12)',
                          }}
                        >
                          <Text style={{ color: colors.accent, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>{index + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>{message}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>-</Text>
                )}
              </Section>

              <Section icon="clipboard-text-outline" title="Brief Guidelines" tint="rgba(250,204,21,0.18)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.briefGuidelines || campaign.videoRequirements || '-'}
                </Text>
              </Section>

              <Section icon="link-variant" title="Example Links" tint="rgba(45,212,191,0.16)">
                {(campaign.exampleLinks || []).length ? (
                  <View style={{ gap: 12 }}>
                    {campaign.exampleLinks?.map((link) => (
                      <Pressable key={link} onPress={() => Linking.openURL(link).catch(() => undefined)}>
                        <Text style={{ color: '#2563EB', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '600' }}>{link}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>-</Text>
                )}
              </Section>

              <Section icon="pound" title="Required Hashtags" tint="rgba(250,204,21,0.22)">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {hashtagText.map((tag) => (
                    <Pill key={tag} label={tag} backgroundColor="rgba(250,204,21,0.28)" color="#B45309" />
                  ))}
                </View>
              </Section>

              <Section icon="shield-check-outline" title="Required Disclosure" tint="rgba(34,211,238,0.18)">
                <Pill label={campaign.requiredDisclosure || '#annons'} backgroundColor="rgba(34,211,238,0.22)" color="#155E75" />
              </Section>

              <Section icon="alert-circle-outline" title="Things To Avoid" tint="rgba(248,113,113,0.18)" borderColor="rgba(254,202,202,0.9)">
                <Text style={{ fontSize: 16, color: palette.text, lineHeight: 24, fontFamily: typography.fontFamily }}>
                  {campaign.thingsToAvoid || '-'}
                </Text>
              </Section>
            </>
          ) : (
            <>
              {loadingDeliverables || loadingAllDeliverables ? <ActivityIndicator color={colors.primary} /> : null}
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
                        mode="dual"
                        value={deliverableInputs[item.id] ?? item.url ?? ''}
                        onChangeText={(text) => setDeliverableInputs((prev) => ({ ...prev, [item.id]: text }))}
                        onSubmit={() => submitCampaignDeliverable(item.id)}
                        onPickVideo={() => submitCampaignVideo(item.id)}
                        loading={submitLinkMutation.isPending}
                        submitLabel={item.status === 'revision_requested' ? 'Re-submit' : 'Submit'}
                        videoStage={activeUploadDeliverableId === item.id ? videoUpload.stage : 'idle'}
                        compressionProgress={activeUploadDeliverableId === item.id ? videoUpload.compressionProgress : 0}
                        videoError={activeUploadDeliverableId === item.id ? videoUpload.error : null}
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
          )}

        </>
      ) : null}
    </Screen>
  )
}
