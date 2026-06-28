import { useApplications } from '@/features/applications/hooks'
import { radii, redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables } from '@/features/deliverables/hooks'
import { useCreatorProfile, useReputation } from '@/features/profile/hooks'
import { TierEmblem, TierRow } from '@/features/profile/ui/TierBadge'
import { useReferral } from '@/features/referral/hooks'
import { referralMilestone } from '@/features/referral/logic'
import { ConnectorBadge } from '@/features/referral/ui/ConnectorBadge'
import { formatCompactCount, stripAtPrefix } from '@/features/auth/api'
import { AvatarPreviewModal } from '@/features/profile/ui/AvatarPreviewModal'
import { ProfileCollaborations } from '@/features/profile/ui/ProfileCollaborations'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MyVideosFeed } from '@/features/deliverables/ui/MyVideosFeed'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { Screen } from '@/features/shared/ui/Screen'
import { GlassCard } from '@/features/shared/ui/GlassCard'
import { signOutCreator } from '@/features/shared/hooks/useAuthSession'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ProfileCoachmarks, type CoachStep } from '@/features/onboarding/ProfileCoachmarks'

const FAINT_LABEL = {
  fontFamily: typography.fontFamily,
  fontSize: 9.5,
  fontWeight: '800' as const,
  color: redesign.color.faint,
  letterSpacing: 1.0,
  textTransform: 'uppercase' as const,
}

const PROFILE_SECTION_LABEL = {
  marginLeft: 4,
  fontFamily: typography.fontFamily,
  fontSize: 11,
  fontWeight: '800' as const,
  color: redesign.color.faint,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
}

function SocialPill({ iconNode, handle, gradient, onPress }: { iconNode: ReactNode; handle: string; gradient?: boolean; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 9 }}>
      {iconNode}
      <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>@{stripAtPrefix(handle)}</Text>
    </View>
  )
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ borderRadius: 999, overflow: 'hidden' }}>
      {gradient ? (
        <LinearGradient colors={['#F25CC1', '#7A3FF2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={{ backgroundColor: redesign.color.ink }}>{inner}</View>
      )}
    </Pressable>
  )
}

function NicheChip({ label, tint, text, dot }: { label: string; tint: string; text: string; dot?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: text }} /> : null}
      <Text style={{ color: text, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  )
}

export function ProfileOverview() {
  const { colors, palette } = useTheme()
  const { data: profile, isLoading: profileLoading, error: profileError } = useCreatorProfile()
  const { data: applicationsData } = useApplications()
  const { data: deliverables } = useDeliverables()
  const { data: referral } = useReferral()
  const connectorEarned = referral ? referralMilestone(referral.joinedCount).reached : false
  const queryClient = useQueryClient()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const acceptedCampaigns = useMemo(() => {
    const acceptedApplications = (applicationsData?.applications || []).filter((item) => item.status === 'accepted')
    const byCampaign = new Map<string, (typeof acceptedApplications)[number]>()
    for (const item of acceptedApplications) {
      if (!byCampaign.has(item.campaignId)) byCampaign.set(item.campaignId, item)
    }
    return Array.from(byCampaign.values()).map((item) => ({
      id: item.campaignId,
      title: item.campaignTitle,
      brandName: item.campaignBrandName || null,
      coverImageUrl: item.campaignImageUrl || null,
      rewardAmount: item.rewardAmount || null,
      rewardType: item.rewardType || null,
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      creatorApplicationStatus: item.status,
    }))
  }, [applicationsData?.applications])

  const stats = useMemo(() => {
    const applications = applicationsData?.applications || []
    return {
      activeCampaignsCount: applications.filter((item) => item.status === 'accepted').length,
      applicationsCount: applications.length,
      deliverablesCount: (deliverables || []).length,
    }
  }, [applicationsData?.applications, deliverables])

  // Creator tier — driven by completed deliverables (see useReputation). Standing
  // is earned by finishing good work, not by applying.
  const { tier: tierProgress } = useReputation()

  const handleSignOut = async () => {
    await signOutCreator()
    queryClient.clear()
    router.replace('/login')
  }

  const verified = profile?.reviewStatus === 'approved'
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ')
  const niches = [profile?.primaryCategory, profile?.secondaryCategory].filter(Boolean) as string[]
  const audience = [
    { label: 'Followers', value: formatCompactCount(profile?.tiktokFollowers) || '0' },
    { label: 'Likes', value: formatCompactCount(profile?.tiktokLikes) || '0' },
    { label: 'Views', value: formatCompactCount(profile?.tiktokViews) || '0' },
  ]

  // Coachmark tour plumbing — refs to the real elements + their scroll offsets.
  const scrollRef = useRef<ScrollView>(null)
  const tierRef = useRef<View>(null)
  const videosRef = useRef<View>(null)
  const insightsRef = useRef<View>(null)
  const inviteRef = useRef<View>(null)
  const contactRef = useRef<View>(null)
  const contentY = useRef<Record<string, number>>({})
  const onLayoutY = (key: string) => (e: { nativeEvent: { layout: { y: number } } }) => { contentY.current[key] = e.nativeEvent.layout.y }
  const coachSteps: CoachStep[] = [
    { key: 'tier', viewRef: tierRef, title: 'Your creator level', body: 'Apply to campaigns to climb the ladder — each tier unlocks a new emblem. Tap to see all levels.' },
    { key: 'videos', viewRef: videosRef, title: 'My videos', body: 'Every video you post for a campaign lands here — your living portfolio.' },
    { key: 'insights', viewRef: insightsRef, title: 'Insights', body: 'Track your views, likes and leaderboard ranking across all your campaigns.' },
    { key: 'invite', viewRef: inviteRef, title: 'Invite friends', body: 'Share your code with other creators. When 3 join, you earn the Connector badge.' },
    { key: 'contact', viewRef: contactRef, title: 'We’re here to help', body: 'Questions? Reach the LikeLab team any time from Contact Us.' },
  ]

  return (
    <Screen
      bgColor={redesign.color.bg}
      scrollRef={scrollRef}
      headerOverlay
      overlay={<ProfileCoachmarks steps={coachSteps} scrollRef={scrollRef} contentY={contentY} />}
    >

      {profileLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {profileError ? <Text style={{ color: redesign.color.muted, fontSize: 12 }}>Could not load creator profile.</Text> : null}

      {profile ? (
        <>
          {/* Identity — editorial */}
          <Animated.View entering={FadeInDown.duration(320)} style={{ alignItems: 'center', paddingTop: 2 }}>
            <Pressable onPress={() => setAvatarOpen(true)}>
              <View>
                <LinearGradient
                  colors={tierProgress.tier.ring}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: 112, height: 112, borderRadius: 38, alignItems: 'center', justifyContent: 'center', ...redesign.shadow.card }}
                >
                  <View style={{ width: 104, height: 104, borderRadius: 33, borderWidth: 3, borderColor: redesign.color.bg, overflow: 'hidden', backgroundColor: '#E6E4F0', alignItems: 'center', justifyContent: 'center' }}>
                    {profile.avatarUrl ? (
                      <ExpoImage source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                    ) : (
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 38, fontWeight: '800', color: redesign.color.purple }}>
                        {(profile.displayName || 'C').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
                {/* Tier emblem overlay — the creator's current level marker */}
                <View style={{ position: 'absolute', right: -3, bottom: -3 }}>
                  <TierEmblem tier={tierProgress.tier} size={34} />
                </View>
              </View>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 30, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.8 }}>
                {profile.displayName || 'Creator'}
              </Text>
              {verified ? <MaterialCommunityIcons name="check-decagram" size={22} color="#1F9BE8" /> : null}
            </View>

            {location ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={redesign.color.muted} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: redesign.color.muted }}>{location}</Text>
              </View>
            ) : null}

            {profile.tiktokBio ? (
              <Text numberOfLines={2} style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: redesign.color.muted, textAlign: 'center', lineHeight: 20, marginTop: 10, maxWidth: 320 }}>
                {profile.tiktokBio}
              </Text>
            ) : null}

            {(profile.instagramHandle || profile.tiktokHandle) ? (
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 16 }}>
                {profile.instagramHandle ? (
                  <SocialPill
                    iconNode={<MaterialCommunityIcons name="instagram" size={15} color="#fff" />}
                    handle={profile.instagramHandle}
                    gradient
                    onPress={() => Linking.openURL(`https://instagram.com/${stripAtPrefix(profile.instagramHandle || '')}`).catch(() => undefined)}
                  />
                ) : null}
                {profile.tiktokHandle ? (
                  <SocialPill
                    iconNode={<FontAwesome5 name="tiktok" size={13} color="#fff" />}
                    handle={profile.tiktokHandle}
                    onPress={profile.tiktokProfileUrl ? () => Linking.openURL(profile.tiktokProfileUrl!).catch(() => undefined) : undefined}
                  />
                ) : null}
              </View>
            ) : null}

            {(niches.length > 0 || verified) ? (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
                {niches[0] ? <NicheChip label={niches[0]} tint="rgba(124,63,242,0.10)" text={redesign.color.purple} /> : null}
                {niches[1] ? <NicheChip label={niches[1]} tint="rgba(31,200,232,0.12)" text="#0E92AD" /> : null}
                {verified ? <NicheChip label="Active" tint={redesign.color.successBg} text={redesign.color.successText} dot /> : null}
              </View>
            ) : null}
          </Animated.View>

          {/* Audience — inline stat row (editorial, hairlines, no heavy card) */}
          <View style={{ flexDirection: 'row', marginTop: 6, paddingVertical: 18, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong }}>
            {audience.map((stat, i) => (
              <View key={stat.label} style={{ flex: 1, alignItems: 'center', gap: 3, borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderLeftColor: redesign.color.hairlineStrong }}>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 23, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{stat.value}</Text>
                <Text style={FAINT_LABEL}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Creator tier — subtle, tappable strip → full ladder screen */}
          <View ref={tierRef} onLayout={onLayoutY('tier')}>
            <TierRow progress={tierProgress} onPress={() => router.push('/tiers')} />
          </View>

          {/* My videos — TikTok-style grid embedded right in the profile */}
          <View ref={videosRef} onLayout={onLayoutY('videos')}>
            <MyVideosFeed />
          </View>

          {/* Work — media-kit image grid */}
          <ProfileCollaborations items={acceptedCampaigns} />

          {/* Activity — slim 3-column row */}
          <View style={{ gap: 8 }}>
            <Text style={PROFILE_SECTION_LABEL}>Activity</Text>
            <View style={{ flexDirection: 'row', backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingVertical: 14, ...redesign.shadow.card }}>
              {[
                { label: 'Active', value: stats.activeCampaignsCount, onPress: () => router.push({ pathname: '/applications', params: { filter: 'accepted' } }) },
                { label: 'Applied', value: stats.applicationsCount, onPress: () => router.push('/applications') },
                { label: 'Delivered', value: stats.deliverablesCount, onPress: () => router.push('/(tabs)/deliverables') },
              ].map((s, i) => (
                <Pressable key={s.label} onPress={s.onPress} style={{ flex: 1, alignItems: 'center', gap: 3, borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderLeftColor: redesign.color.hairlineStrong }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 20, fontWeight: '900', color: redesign.color.ink, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{s.value}</Text>
                  <Text style={FAINT_LABEL}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Insights entry — campaign performance (views/likes/rank) */}
          <View ref={insightsRef} onLayout={onLayoutY('insights')}>
          <Pressable
            onPress={() => router.push('/insights')}
            accessibilityRole="button"
            accessibilityLabel="View insights"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 16, paddingVertical: 14, ...redesign.shadow.card }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(124,63,242,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chart-line" size={19} color={redesign.color.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: redesign.color.ink }}>Insights</Text>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted, marginTop: 1 }}>Views, likes & ranking across campaigns</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
          </Pressable>
          </View>

          {/* Invite friends entry — referral loop */}
          <View ref={inviteRef} onLayout={onLayoutY('invite')}>
          <Pressable
            onPress={() => router.push('/invite')}
            accessibilityRole="button"
            accessibilityLabel="Invite friends"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 16, paddingVertical: 14, ...redesign.shadow.card }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(242,92,193,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="gift-outline" size={19} color={redesign.color.magenta} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', color: redesign.color.ink }}>Invite friends</Text>
              {connectorEarned ? (
                <ConnectorBadge compact />
              ) : (
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted }}>Share your code & grow the community</Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
          </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <View style={{ flex: 2 }}>
              <LiquidButton
                label="Edit Profile"
                onPress={() => router.push('/settings')}
                minHeight={50}
                borderRadius={18}
                icon={<MaterialCommunityIcons name="account-edit-outline" size={18} color="#fff" />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <LiquidButton
                label="Log Out"
                onPress={handleSignOut}
                minHeight={50}
                borderRadius={18}
                tone="neutral"
                icon={<MaterialCommunityIcons name="logout-variant" size={17} color={palette.textMuted} />}
              />
            </View>
          </View>

          <AvatarPreviewModal visible={avatarOpen} uri={profile.avatarUrl || undefined} onClose={() => setAvatarOpen(false)} />
        </>
      ) : null}

      <View ref={contactRef} onLayout={onLayoutY('contact')}>
      <GlassCard radius={radii.card} style={{ marginTop: 8 }}>
        <View>
        <Pressable
          onPress={() => setContactOpen((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700' }}>
            Contact Us
          </Text>
          <MaterialCommunityIcons name={contactOpen ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textMuted} />
        </Pressable>
        {contactOpen ? (
          <>
            {[
              { icon: 'email-outline', label: 'Email', sub: 'info@likelab.io', url: 'mailto:info@likelab.io' },
              { icon: 'phone-outline', label: 'Phone', sub: '040-614 31 60', url: 'tel:+46406143160' },
              { icon: 'instagram', label: 'Instagram', sub: '@likelab', url: 'https://instagram.com/likelab' },
              { icon: 'linkedin', label: 'LinkedIn', sub: 'likelab-io', url: 'https://www.linkedin.com/company/likelab-io' },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => Linking.openURL(item.url).catch(() => {})}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderTopWidth: 0.5,
                  borderColor: 'rgba(255,255,255,0.6)',
                }}
              >
                <MaterialCommunityIcons name={item.icon as any} size={20} color={palette.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>{item.sub}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={palette.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}
        </View>
      </GlassCard>
      </View>
    </Screen>
  )
}
