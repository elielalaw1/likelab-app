import { useAcceptInvitation, useApplications, useDeclineInvitation } from '@/features/applications/hooks'
import { campaignRouteParams } from '@/features/campaigns/navigation'
import { redesign, typography } from '@/features/core/theme'
import { springs } from '@/features/motion/springs'
import { haptic } from '@/features/shared/haptics'
import { CreatorInvitation } from '@/features/core/types'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonCampaignCard } from '@/features/shared/ui/SkeletonCard'
import { toast } from '@/features/shared/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'

type FilterKey = 'all' | 'accepted' | 'pending' | 'closed'

export const options = {
  tabBarButton: () => null,
}

function FilterTab({
  label,
  active,
  onPress,
  onLayout,
}: {
  label: string
  active: boolean
  onPress: () => void
  onLayout: (x: number, width: number) => void
}) {
  return (
    <Pressable
      onPress={() => { haptic.selection(); onPress() }}
      onLayout={(event) => onLayout(event.nativeEvent.layout.x, event.nativeEvent.layout.width)}
      style={{ flex: 1, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: active ? redesign.color.ink : redesign.color.muted,
          fontFamily: typography.fontFamily,
          fontSize: 13,
          fontWeight: active ? '800' : '600',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

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
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
      <LiquidButton label="Accept" onPress={() => onAccept(invitation.id)} disabled={loading} minHeight={44} borderRadius={18} style={{ flex: 1 }} />
      <LiquidButton label="Decline" onPress={() => onDecline(invitation.id)} disabled={loading} tone="danger" minHeight={44} borderRadius={18} style={{ flex: 1 }} />
    </View>
  )
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient()
  const params = useLocalSearchParams<{ filter?: string }>()
  const initialFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter
  const { data, isLoading, error, refetch } = useApplications()

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['applications'] })
    await refetch()
  }, [queryClient, refetch])
  const acceptInvitation = useAcceptInvitation()
  const declineInvitation = useDeclineInvitation()
  const [activeFilter, setActiveFilter] = useState<FilterKey>(
    initialFilter === 'accepted' || initialFilter === 'pending' || initialFilter === 'closed' ? initialFilter : 'all'
  )
  const [tabMetrics, setTabMetrics] = useState<Record<FilterKey, { x: number; width: number }>>({
    all: { x: 0, width: 0 },
    accepted: { x: 0, width: 0 },
    pending: { x: 0, width: 0 },
    closed: { x: 0, width: 0 },
  })
  const bubbleX = useSharedValue(0)
  const bubbleWidth = useSharedValue(0)
  const bubbleScale = useSharedValue(1)

  const pendingInvitations = (data?.invitations || []).filter((item) => item.status === 'pending')
  const declinedInvitations = (data?.invitations || []).filter((item) => item.status === 'declined')
  const acceptedApplications = (data?.applications || []).filter((item) => item.status === 'accepted')
  const closedApplications = (data?.applications || [])
    .filter((item) => item.status === 'rejected' || item.status === 'withdrawn')
    .sort((a, b) => {
      const rank = (status: string) => (status === 'rejected' ? 1 : 0)
      return rank(a.status) - rank(b.status)
    })
  const appliedApplications = (data?.applications || []).filter((item) => item.status === 'applied')

  const filteredBlocks = useMemo(() => {
    if (activeFilter === 'accepted') {
      return acceptedApplications.map((item) => ({
        key: item.id,
        type: 'campaign' as const,
        title: 'Accepted campaign',
        campaign: {
          id: item.campaignId,
          title: item.campaignTitle,
          coverImageUrl: item.campaignImageUrl,
          brandName: item.campaignBrandName,
          rewardAmount: item.rewardAmount,
          rewardType: item.rewardType,
          startDate: item.startDate,
          endDate: item.endDate,
          creatorApplicationStatus: 'accepted' as const,
        },
      }))
    }

    if (activeFilter === 'pending') {
      return [
        ...pendingInvitations.map((item) => ({
          key: item.id,
          type: 'invitation' as const,
          invitation: item,
        })),
        ...appliedApplications.map((item) => ({
          key: item.id,
          type: 'campaign' as const,
          title: 'Pending application',
          campaign: {
            id: item.campaignId,
            title: item.campaignTitle,
            coverImageUrl: item.campaignImageUrl,
            brandName: item.campaignBrandName,
            rewardAmount: item.rewardAmount,
            rewardType: item.rewardType,
            startDate: item.startDate,
            endDate: item.endDate,
            creatorApplicationStatus: item.status,
          },
        })),
      ]
    }

    if (activeFilter === 'closed') {
      return [
        ...closedApplications.map((item) => ({
          key: item.id,
          type: 'campaign' as const,
          title: 'Closed application',
          campaign: {
            id: item.campaignId,
            title: item.campaignTitle,
            coverImageUrl: item.campaignImageUrl,
            brandName: item.campaignBrandName,
            rewardAmount: item.rewardAmount,
            rewardType: item.rewardType,
            startDate: item.startDate,
            endDate: item.endDate,
            creatorApplicationStatus: item.status,
          },
        })),
        ...declinedInvitations.map((item) => ({
          key: item.id,
          type: 'invitation_closed' as const,
          invitation: item,
        })),
      ]
    }

    return [
      ...pendingInvitations.map((item) => ({ key: item.id, type: 'invitation' as const, invitation: item })),
      ...acceptedApplications.map((item) => ({
        key: item.id,
        type: 'campaign' as const,
        title: 'Accepted campaign',
        campaign: {
          id: item.campaignId,
          title: item.campaignTitle,
          coverImageUrl: item.campaignImageUrl,
          brandName: item.campaignBrandName,
          rewardAmount: item.rewardAmount,
          rewardType: item.rewardType,
          startDate: item.startDate,
          endDate: item.endDate,
          creatorApplicationStatus: 'accepted' as const,
        },
      })),
      ...appliedApplications.map((item) => ({
        key: item.id,
        type: 'campaign' as const,
        title: 'Pending application',
        campaign: {
          id: item.campaignId,
          title: item.campaignTitle,
          coverImageUrl: item.campaignImageUrl,
          brandName: item.campaignBrandName,
          rewardAmount: item.rewardAmount,
          rewardType: item.rewardType,
          startDate: item.startDate,
          endDate: item.endDate,
          creatorApplicationStatus: item.status,
        },
      })),
      ...closedApplications.map((item) => ({
        key: item.id,
        type: 'campaign' as const,
        title: 'Closed application',
        campaign: {
          id: item.campaignId,
          title: item.campaignTitle,
          coverImageUrl: item.campaignImageUrl,
          brandName: item.campaignBrandName,
          rewardAmount: item.rewardAmount,
          rewardType: item.rewardType,
          startDate: item.startDate,
          endDate: item.endDate,
          creatorApplicationStatus: item.status,
        },
      })),
      ...declinedInvitations.map((item) => ({
        key: item.id,
        type: 'invitation_closed' as const,
        invitation: item,
      })),
    ]
  }, [activeFilter, acceptedApplications, appliedApplications, closedApplications, declinedInvitations, pendingInvitations])

  const onAccept = async (invitationId: string) => {
    try {
      await acceptInvitation.mutateAsync(invitationId)
      toast.success('Invitation accepted!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not accept invitation')
    }
  }

  const onDecline = async (invitationId: string) => {
    try {
      await declineInvitation.mutateAsync(invitationId)
      toast.info('Invitation declined.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not decline invitation')
    }
  }

  useEffect(() => {
    if (initialFilter === 'accepted' || initialFilter === 'pending' || initialFilter === 'closed' || initialFilter === 'all') {
      setActiveFilter(initialFilter)
    }
  }, [initialFilter])

  useEffect(() => {
    const metric = tabMetrics[activeFilter]
    if (!metric?.width) return
    bubbleX.value = withSpring(metric.x, springs.balanced)
    bubbleWidth.value = withSpring(metric.width, springs.balanced)
    bubbleScale.value = withSequence(withTiming(1.05, { duration: 120 }), withTiming(1, { duration: 180 }))
  }, [activeFilter, bubbleScale, bubbleWidth, bubbleX, tabMetrics])

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleX.value }, { scale: bubbleScale.value }],
    width: bubbleWidth.value,
  }))


  return (
    <Screen onRefresh={onRefresh} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1 }}>
          Applications
        </Text>
        <Text style={{ color: redesign.color.muted, fontSize: 14.5, fontWeight: '500', fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Invitations, accepted campaigns and everything in motion.
        </Text>
      </Animated.View>

      {error ? <Text style={{ color: redesign.color.muted, fontSize: 12 }}>Could not load applications right now.</Text> : null}

      <View style={{ flexDirection: 'row', gap: 4, padding: 5, borderRadius: 16, backgroundColor: '#ECEAE4' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              top: 5,
              height: 36,
              borderRadius: 12,
              backgroundColor: '#fff',
              shadowColor: '#0B0B0F',
              shadowOpacity: 0.10,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            },
            bubbleStyle,
          ]}
        />
        <FilterTab label="All" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, all: { x, width } }))} />
        <FilterTab label="Accepted" active={activeFilter === 'accepted'} onPress={() => setActiveFilter('accepted')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, accepted: { x, width } }))} />
        <FilterTab label="Pending" active={activeFilter === 'pending'} onPress={() => setActiveFilter('pending')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, pending: { x, width } }))} />
        <FilterTab label="Closed" active={activeFilter === 'closed'} onPress={() => setActiveFilter('closed')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, closed: { x, width } }))} />
      </View>

      {isLoading ? (
        <>
          <SkeletonCampaignCard />
          <SkeletonCampaignCard />
          <SkeletonCampaignCard />
        </>
      ) : null}

      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item.key}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="Nothing here"
              subtitle={
                activeFilter === 'accepted'
                  ? 'Accepted campaigns will show here.'
                  : activeFilter === 'pending'
                    ? 'Pending invitations and applied campaigns will show here.'
                    : activeFilter === 'closed'
                      ? 'Rejected or withdrawn campaigns will show here.'
                      : 'Your application activity will show here.'
              }
              icon="file-document-outline"
            />
          ) : null
        }
        renderItem={({ item }) =>
          item.type === 'invitation' ? (
            <View
              style={{
                borderRadius: 24,
                backgroundColor: redesign.color.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: redesign.color.hairlineStrong,
                padding: 12,
                ...redesign.shadow.card,
              }}
            >
              <CampaignCard
                campaign={{
                  id: item.invitation.campaignId,
                  title: item.invitation.campaignTitle,
                  coverImageUrl: item.invitation.campaignImageUrl,
                  brandName: item.invitation.campaignBrandName,
                  rewardAmount: item.invitation.rewardAmount,
                  rewardType: item.invitation.rewardType,
                  startDate: item.invitation.startDate,
                  endDate: item.invitation.endDate,
                  invitationStatus: item.invitation.status,
                }}
                onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.invitation.campaignId } } as never)}
              />
              <InvitationActions invitation={item.invitation} onAccept={onAccept} onDecline={onDecline} loading={acceptInvitation.isPending || declineInvitation.isPending} />
            </View>
          ) : item.type === 'invitation_closed' ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
                Closed invitation
              </Text>
              <CampaignCard
                campaign={{
                  id: item.invitation.campaignId,
                  title: item.invitation.campaignTitle,
                  coverImageUrl: item.invitation.campaignImageUrl,
                  brandName: item.invitation.campaignBrandName,
                  rewardAmount: item.invitation.rewardAmount,
                  rewardType: item.invitation.rewardType,
                  startDate: item.invitation.startDate,
                  endDate: item.invitation.endDate,
                  invitationStatus: item.invitation.status,
                }}
                onPress={() => router.push({ pathname: '/campaigns/[id]', params: { id: item.invitation.campaignId } } as never)}
              />
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
                {item.title}
              </Text>
              <CampaignCard campaign={item.campaign} onPress={() => router.push(campaignRouteParams(item.campaign) as never)} />
            </View>
          )
        }
      />
    </Screen>
  )
}
