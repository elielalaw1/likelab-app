import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { formatCurrencySek, formatDateRange, looksLikeTikTokUrl } from '@/features/core/format'
import { colors, palette, radii, shadows, typography } from '@/features/core/theme'
import { useApplyToCampaign, useCampaign, useCampaignDeliverables } from '@/features/campaigns/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { useCreatorProfile } from '@/features/profile/hooks'
import { DeliverableInputRow } from '@/features/shared/ui/DeliverableInputRow'
import { useSubmitDeliverable } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'

export default function CampaignDetailPage() {
  const params = useLocalSearchParams<{ id: string }>()
  const campaignId = Array.isArray(params.id) ? params.id[0] : params.id

  const { data: campaign, isLoading, error } = useCampaign(campaignId)
  const { data: profile } = useCreatorProfile()
  const { data: campaignDeliverables, isLoading: loadingDeliverables } = useCampaignDeliverables(campaignId)
  const applyMutation = useApplyToCampaign()
  const submitMutation = useSubmitDeliverable()
  const [activeTab, setActiveTab] = useState<'brief' | 'videos'>('brief')
  const [deliverableInputs, setDeliverableInputs] = useState<Record<string, string>>({})

  const canApply = Boolean(profile?.reviewStatus === 'approved' && isProfileComplete(profile))
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
      Alert.alert('Success', 'Application sent.')
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
      await submitMutation.mutateAsync({ deliverableId, url: value })
      Alert.alert('Success', 'Deliverable submitted.')
      setDeliverableInputs((prev) => ({ ...prev, [deliverableId]: '' }))
    } catch (submitError) {
      Alert.alert('Submission failed', submitError instanceof Error ? submitError.message : 'Could not submit deliverable')
    }
  }

  const hashtagText = useMemo(() => campaign?.requiredHashtags?.join(' ') || '#annons', [campaign?.requiredHashtags])

  return (
    <Screen tabAware={false}>
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
            <SectionCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
                  {campaign.title}
                </Text>
                <StatusBadge status={campaign.creatorApplicationStatus || campaign.status} />
              </View>
              <Text style={{ color: palette.textMuted, fontSize: 14, fontFamily: typography.fontFamily }}>
                {campaign.brandName || campaign.description || 'Campaign details'}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: radii.card, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(234,236,239,0.5)' }}>
                {[
                  { label: 'Reward', value: formatCurrencySek(campaign.rewardAmount) || campaign.rewardValue || '-' },
                  { label: 'Videos', value: `${uploadedCount}/${campaign.requiredVideos || 1}` },
                  { label: 'Level', value: campaign.level || '-' },
                  { label: 'Timeline', value: formatDateRange(campaign.startDate, campaign.endDate) || '-' },
                ].map((stat, idx) => (
                  <View
                    key={stat.label}
                    style={{
                      width: '50%',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRightWidth: idx % 2 === 0 ? 1 : 0,
                      borderBottomWidth: idx < 2 ? 1 : 0,
                      borderColor: 'rgba(234,236,239,0.5)',
                      gap: 2,
                    }}
                  >
                    <Text style={{ color: colors.mutedForeground, fontWeight: '600', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
                      {stat.label}
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>
                      {stat.value}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={handleApply}
                disabled={applyMutation.isPending || !canApply || applyBlockedByStatus}
                style={{
                  marginTop: 8,
                  borderRadius: radii.button,
                  backgroundColor: canApply ? colors.primary : colors.mutedForeground,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: applyMutation.isPending ? 0.5 : 1,
                  ...shadows.hero,
                }}
              >
                <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '600', fontFamily: typography.fontFamily }}>
                  {currentApplicationStatus === 'rejected' || currentApplicationStatus === 'withdrawn'
                    ? 'Apply Again'
                    : applyBlockedByStatus
                      ? `Application: ${currentApplicationStatus}`
                    : applyMutation.isPending
                      ? 'Applying...'
                      : 'Apply to Campaign'}
                </Text>
              </Pressable>
              {!canApply ? (
                <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily }}>
                  You need review_status approved and 100% profile completion to apply.
                </Text>
              ) : null}
              {applyBlockedByStatus ? (
                <Text style={{ color: palette.textMuted, fontSize: 12, fontFamily: typography.fontFamily }}>
                  You already have an active application for this campaign.
                </Text>
              ) : null}
            </SectionCard>
          </Animated.View>

          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              padding: 6,
              borderRadius: radii.tabContainer,
              backgroundColor: 'rgba(255,255,255,0.8)',
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.5)',
            }}
          >
            <Pressable
              onPress={() => setActiveTab('brief')}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: radii.tabButton,
                backgroundColor: activeTab === 'brief' ? colors.foreground : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: activeTab === 'brief' ? colors.background : colors.mutedForeground }}>
                Campaign Brief
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('videos')}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: radii.tabButton,
                backgroundColor: activeTab === 'videos' ? colors.foreground : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: activeTab === 'videos' ? colors.background : colors.mutedForeground }}>
                Your Videos ({campaignDeliverables?.length || 0})
              </Text>
            </Pressable>
          </View>

          {activeTab === 'brief' ? (
            <>
              <SectionCard title="Campaign Goal">
                <Text style={{ fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}>{campaign.campaignGoal || '-'}</Text>
              </SectionCard>

              <SectionCard title="Video Requirements">
                <Text style={{ fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}>{campaign.videoRequirements || '-'}</Text>
              </SectionCard>

              <SectionCard title="Your Instructions">
                <Text style={{ fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}>{campaign.instructions || campaign.briefGuidelines || '-'}</Text>
              </SectionCard>

              <SectionCard title="Brand Voice">
                <Text style={{ fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}>{campaign.brandVoice || '-'}</Text>
              </SectionCard>

              <SectionCard title="Required Disclosure">
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.text,
                    backgroundColor: 'rgba(23,31,42,0.04)',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    fontFamily: typography.fontFamily,
                    fontWeight: '500',
                  }}
                >
                  {campaign.requiredDisclosure || '#annons'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: palette.text,
                    backgroundColor: 'rgba(23,31,42,0.04)',
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.full,
                    fontFamily: typography.fontFamily,
                    fontWeight: '500',
                  }}
                >
                  {hashtagText}
                </Text>
              </SectionCard>

              <SectionCard title="Things To Avoid">
                <View style={{ backgroundColor: 'rgba(239,68,68,0.04)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: radii.card, padding: 16 }}>
                  <Text style={{ fontSize: 14, color: palette.text, fontFamily: typography.fontFamily }}>{campaign.thingsToAvoid || '-'}</Text>
                </View>
              </SectionCard>

              <SectionCard title="Prize Distribution">
                {(campaign.prizeDistribution || [campaign.rewardAmount || 0]).map((item, index) => {
                  const medalColors = [
                    { bg: '#FEF3C7', text: '#B45309' },
                    { bg: '#F3F4F6', text: '#4B5563' },
                    { bg: '#FFEDD5', text: '#C2410C' },
                  ]
                  const medal = medalColors[index] || { bg: colors.muted, text: colors.mutedForeground }

                  return (
                    <View key={`${campaign.id}-${item}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: medal.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontWeight: '700', color: medal.text, fontFamily: typography.fontFamily, fontSize: 12 }}>{index + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily }}>{formatCurrencySek(item)}</Text>
                    </View>
                  )
                })}
              </SectionCard>
            </>
          ) : (
            <>
              {loadingDeliverables ? <ActivityIndicator color={colors.primary} /> : null}
              <FlatList
                data={campaignDeliverables || []}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                ListEmptyComponent={!loadingDeliverables ? <EmptyState title="No Videos Yet" subtitle="Assigned deliverables will appear in this tab." icon="video-outline" /> : null}
                renderItem={({ item }) => (
                  <SectionCard title={item.campaignTitle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: palette.text, fontFamily: typography.fontFamily }}>
                        {`${item.platform || 'tiktok'} - ${item.type || 'video'}`}
                      </Text>
                      <StatusBadge status={item.status} />
                    </View>
                    <DeliverableInputRow
                      value={deliverableInputs[item.id] ?? item.url ?? ''}
                      onChangeText={(text) => setDeliverableInputs((prev) => ({ ...prev, [item.id]: text }))}
                      onSubmit={() => submitCampaignDeliverable(item.id)}
                      loading={submitMutation.isPending}
                    />
                  </SectionCard>
                )}
              />
            </>
          )}
        </>
      ) : null}
    </Screen>
  )
}
