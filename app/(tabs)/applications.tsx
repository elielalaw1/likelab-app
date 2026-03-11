import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useMemo, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { useAcceptInvitation, useApplications, useDeclineInvitation } from '@/features/applications/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { ApplicationStatus, CreatorInvitation } from '@/features/core/types'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'
const statusSections: { key: ApplicationStatus; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
]

function InvitationActions({
  invitation,
  onAccept,
  onDecline,
  loading,
}: {
  invitation: CreatorInvitation
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  loading: boolean
}) {
  if (invitation.status !== 'pending') return null

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
      <Pressable
        onPress={() => onAccept(invitation.id)}
        disabled={loading}
        style={{
          flex: 1,
          minHeight: 40,
          borderRadius: radii.button,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontWeight: '600', fontSize: 14 }}>Accept</Text>
      </Pressable>
      <Pressable
        onPress={() => onDecline(invitation.id)}
        disabled={loading}
        style={{
          flex: 1,
          minHeight: 40,
          borderRadius: radii.button,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: 'rgba(239,68,68,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#B91C1C', fontFamily: typography.fontFamily, fontWeight: '600', fontSize: 14 }}>Decline</Text>
      </Pressable>
    </View>
  )
}

export default function ApplicationsPage() {
  const { data, isLoading, error } = useApplications()
  const acceptInvitation = useAcceptInvitation()
  const declineInvitation = useDeclineInvitation()
  const [expandedStatuses, setExpandedStatuses] = useState<Record<ApplicationStatus, boolean>>({
    accepted: true,
    applied: false,
    rejected: false,
    withdrawn: false,
  })
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [activeExpanded, setActiveExpanded] = useState(true)
  const [pastExpanded, setPastExpanded] = useState(false)

  const pendingInvitations = (data?.invitations || []).filter((item) => item.status === 'pending')
  const pastInvitations = (data?.invitations || []).filter((item) => item.status !== 'pending')
  const applications = useMemo(() => data?.applications || [], [data?.applications])
  const applicationsByStatus = useMemo(
    () => ({
      accepted: applications.filter((item) => item.status === 'accepted'),
      applied: applications.filter((item) => item.status === 'applied'),
      rejected: applications.filter((item) => item.status === 'rejected'),
      withdrawn: applications.filter((item) => item.status === 'withdrawn'),
    }),
    [applications]
  )

  const onAccept = async (invitationId: string) => {
    try {
      await acceptInvitation.mutateAsync(invitationId)
      Alert.alert('Accepted', 'Invitation accepted and application created.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not accept invitation')
    }
  }

  const onDecline = async (invitationId: string) => {
    try {
      await declineInvitation.mutateAsync(invitationId)
      Alert.alert('Declined', 'Invitation declined.')
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not decline invitation')
    }
  }

  const invitationCard = (item: CreatorInvitation) => (
    <>
      <CampaignCard
        campaign={{
          id: item.campaignId,
          title: item.campaignTitle,
          coverImageUrl: item.campaignImageUrl,
          brandName: item.campaignBrandName,
          rewardAmount: item.rewardAmount,
          rewardType: item.rewardType,
          startDate: item.startDate,
          endDate: item.endDate,
          invitationStatus: item.status,
        }}
        onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.campaignId } } as never)}
      />
      <InvitationActions
        invitation={item}
        onAccept={onAccept}
        onDecline={onDecline}
        loading={acceptInvitation.isPending || declineInvitation.isPending}
      />
    </>
  )

  return (
    <Screen overlay={<CreatorOnboardingGate />} overlayPadding={136}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          My Applications
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Track your applications and campaign invitations
        </Text>
      </Animated.View>

      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load applications right now.</Text> : null}

      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        Pending Invitations
      </Text>
      <View
        style={{
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.65)',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: 12,
          gap: 10,
        }}
      >
        <Pressable onPress={() => setPendingExpanded((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 14, color: palette.text }}>Pending Invitations</Text>
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(74,18,160,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 11 }}>{pendingInvitations.length}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name={pendingExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </Pressable>

        {pendingExpanded ? (
          <FlatList
            data={pendingInvitations}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={!isLoading ? <EmptyState title="No Pending Invitations" subtitle="New invitations will show here." icon="email-outline" /> : null}
            renderItem={({ item }) => invitationCard(item)}
          />
        ) : null}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        Active Campaigns
      </Text>
      <View
        style={{
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.65)',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: 12,
          gap: 10,
        }}
      >
        <Pressable onPress={() => setActiveExpanded((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 14, color: palette.text }}>Accepted</Text>
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(74,18,160,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 11 }}>{applicationsByStatus.accepted.length}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name={activeExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </Pressable>

        {activeExpanded ? (
          <FlatList
            data={applicationsByStatus.accepted}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              !isLoading ? <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>No active campaigns yet.</Text> : null
            }
            renderItem={({ item }) => (
              <CampaignCard
                campaign={{
                  id: item.campaignId,
                  title: item.campaignTitle,
                  coverImageUrl: item.campaignImageUrl,
                  brandName: item.campaignBrandName,
                  rewardAmount: item.rewardAmount,
                  rewardType: item.rewardType,
                  startDate: item.startDate,
                  endDate: item.endDate,
                  creatorApplicationStatus: item.status,
                }}
                onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.campaignId } } as never)}
              />
            )}
          />
        ) : null}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        Past Invitations
      </Text>
      <View
        style={{
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.65)',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: 12,
          gap: 10,
        }}
      >
        <Pressable onPress={() => setPastExpanded((prev) => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 14, color: palette.text }}>Past Invitations</Text>
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: 'rgba(74,18,160,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 11 }}>{pastInvitations.length}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name={pastExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
        </Pressable>

        {pastExpanded ? (
          <FlatList
            data={pastInvitations}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={!isLoading ? <EmptyState title="No Past Invitations" subtitle="Accepted or declined invitations will show here." icon="history" /> : null}
            renderItem={({ item }) => invitationCard(item)}
          />
        ) : null}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
        Other Applications
      </Text>
      {!isLoading && applications.length === 0 ? (
        <EmptyState title="No Applications" subtitle="Apply to a campaign to see your applications." icon="file-document-outline" />
      ) : null}

      {statusSections.map((section) => {
        const sectionItems = applicationsByStatus[section.key]
        const expanded = expandedStatuses[section.key]
        const count = sectionItems.length

        return (
          <View
            key={section.key}
            style={{
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.65)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: 12,
              gap: 10,
            }}
          >
            <Pressable
              onPress={() =>
                setExpandedStatuses((prev) => ({
                  ...prev,
                  [section.key]: !prev[section.key],
                }))
              }
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 14, color: palette.text }}>
                  {section.label}
                </Text>
                <View
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: 'rgba(74,18,160,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontWeight: '700', fontSize: 11 }}>{count}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
            </Pressable>

            {expanded ? (
              count > 0 ? (
                <FlatList
                  data={sectionItems}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                  renderItem={({ item }) => (
                    <CampaignCard
                      campaign={{
                        id: item.campaignId,
                        title: item.campaignTitle,
                        coverImageUrl: item.campaignImageUrl,
                        brandName: item.campaignBrandName,
                        rewardAmount: item.rewardAmount,
                        rewardType: item.rewardType,
                        startDate: item.startDate,
                        endDate: item.endDate,
                        creatorApplicationStatus: item.status,
                      }}
                      onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.campaignId } } as never)}
                    />
                  )}
                />
              ) : (
                <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 12 }}>
                  No {section.label.toLowerCase()} applications yet.
                </Text>
              )
            ) : null}
          </View>
        )
      })}
    </Screen>
  )
}
