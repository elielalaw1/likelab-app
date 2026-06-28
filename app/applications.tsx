import { useAcceptInvitation, useApplications, useDeclineInvitation } from '@/features/applications/hooks'
import { markLocalInvitationAccept } from '@/features/shared/hooks/useApplicationRealtime'
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
import { useDeliverables } from '@/features/deliverables/hooks'
import { isAwaitingLink } from '@/features/deliverables/api'
import { useQueryClient } from '@tanstack/react-query'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'

type FilterKey = 'all' | 'accepted' | 'pending' | 'closed'

// Clear, colour-coded status for each application — so accepted / pending /
// rejected / invited read at a glance instead of being buried in the cards.
type AppStatus = 'invited' | 'active' | 'pending' | 'rejected' | 'withdrawn' | 'declined'
const STATUS_META: Record<AppStatus, { label: string; color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  invited:   { label: 'Invited',        color: '#B45309', bg: '#FFF7E8',                 icon: 'email-heart-outline' },
  active:    { label: 'Active',         color: '#0E9F6E', bg: 'rgba(16,185,129,0.12)',   icon: 'rocket-launch-outline' },
  pending:   { label: 'Pending review', color: '#7A3FF2', bg: 'rgba(124,63,242,0.10)',   icon: 'clock-outline' },
  rejected:  { label: 'Not selected',   color: '#6B6B76', bg: 'rgba(11,11,15,0.05)',     icon: 'close-circle-outline' },
  withdrawn: { label: 'Withdrawn',      color: '#6B6B76', bg: 'rgba(11,11,15,0.05)',     icon: 'undo-variant' },
  declined:  { label: 'Declined',       color: '#6B6B76', bg: 'rgba(11,11,15,0.05)',     icon: 'cancel' },
}

function StatusChip({ status }: { status: AppStatus }) {
  const m = STATUS_META[status]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: m.bg }}>
      <MaterialCommunityIcons name={m.icon} size={13} color={m.color} />
      <Text style={{ color: m.color, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800', letterSpacing: -0.1 }}>{m.label}</Text>
    </View>
  )
}

function FilterTab({
  label,
  count,
  active,
  onPress,
  onLayout,
}: {
  label: string
  count?: number
  active: boolean
  onPress: () => void
  onLayout: (x: number, width: number) => void
}) {
  return (
    <Pressable
      onPress={() => { haptic.selection(); onPress() }}
      onLayout={(event) => onLayout(event.nativeEvent.layout.x, event.nativeEvent.layout.width)}
      style={{ flex: 1, height: 36, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}
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
      {count ? (
        <View style={{ minWidth: 17, height: 17, borderRadius: 8.5, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? redesign.color.ink : 'rgba(11,11,15,0.08)' }}>
          <Text style={{ color: active ? '#fff' : redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800' }}>{count}</Text>
        </View>
      ) : null}
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
  const { data: deliverables } = useDeliverables()

  // Outstanding to-dos per campaign (uploads / revisions / links awaiting) — drives
  // the "N to do" next-step on active campaigns.
  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of deliverables || []) {
      if (d.status === 'pending' || d.status === 'revision_requested' || isAwaitingLink(d)) {
        counts[d.campaignId] = (counts[d.campaignId] || 0) + 1
      }
    }
    return counts
  }, [deliverables])

  const onRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // The ['applications'] query is kept warm elsewhere with refetchOnMount:false, so
  // navigating here wouldn't otherwise pick up new invitations. Refetch on focus so
  // pending invites appear without a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
    }, [queryClient])
  )

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

  const pendingInvitations = useMemo(() => (data?.invitations || []).filter((item) => item.status === 'pending'), [data?.invitations])
  const declinedInvitations = useMemo(() => (data?.invitations || []).filter((item) => item.status === 'declined'), [data?.invitations])
  const acceptedApplications = useMemo(() => (data?.applications || []).filter((item) => item.status === 'accepted'), [data?.applications])
  const closedApplications = useMemo(
    () =>
      (data?.applications || [])
        .filter((item) => item.status === 'rejected' || item.status === 'withdrawn')
        .sort((a, b) => {
          const rank = (status: string) => (status === 'rejected' ? 1 : 0)
          return rank(a.status) - rank(b.status)
        }),
    [data?.applications]
  )
  const appliedApplications = useMemo(() => (data?.applications || []).filter((item) => item.status === 'applied'), [data?.applications])

  const counts = useMemo(
    () => ({
      accepted: acceptedApplications.length,
      pending: pendingInvitations.length + appliedApplications.length,
      closed: closedApplications.length + declinedInvitations.length,
    }),
    [acceptedApplications, pendingInvitations, appliedApplications, closedApplications, declinedInvitations],
  )

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
      // Tell the realtime listener a local accept just happened so it doesn't also
      // fire its own "accepted" toast for the same action.
      markLocalInvitationAccept()
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
        <FilterTab label="All" count={counts.accepted + counts.pending + counts.closed} active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, all: { x, width } }))} />
        <FilterTab label="Accepted" count={counts.accepted} active={activeFilter === 'accepted'} onPress={() => setActiveFilter('accepted')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, accepted: { x, width } }))} />
        <FilterTab label="Pending" count={counts.pending} active={activeFilter === 'pending'} onPress={() => setActiveFilter('pending')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, pending: { x, width } }))} />
        <FilterTab label="Closed" count={counts.closed} active={activeFilter === 'closed'} onPress={() => setActiveFilter('closed')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, closed: { x, width } }))} />
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
        renderItem={({ item }) => {
          if (item.type === 'invitation') {
            return (
              <View
                style={{
                  borderRadius: 24,
                  backgroundColor: redesign.color.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: 'rgba(180,83,9,0.35)',
                  padding: 12,
                  gap: 10,
                  ...redesign.shadow.card,
                }}
              >
                <StatusChip status="invited" />
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
                <InvitationActions
                  invitation={item.invitation}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  loading={
                    (acceptInvitation.isPending && acceptInvitation.variables === item.invitation.id) ||
                    (declineInvitation.isPending && declineInvitation.variables === item.invitation.id)
                  }
                />
              </View>
            )
          }
          if (item.type === 'invitation_closed') {
            return (
              <View style={{ gap: 8 }}>
                <StatusChip status="declined" />
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
            )
          }
          const appStatus: AppStatus =
            item.campaign.creatorApplicationStatus === 'accepted'
              ? 'active'
              : item.campaign.creatorApplicationStatus === 'rejected'
                ? 'rejected'
                : item.campaign.creatorApplicationStatus === 'withdrawn'
                  ? 'withdrawn'
                  : 'pending'
          const todo = appStatus === 'active' ? badgeCounts[item.campaign.id] || 0 : 0
          return (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <StatusChip status={appStatus} />
                {appStatus === 'active' ? (
                  todo > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: 'rgba(124,63,242,0.10)' }}>
                      <MaterialCommunityIcons name="arrow-right-circle" size={13} color={redesign.color.purple} />
                      <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>{`${todo} to do`}</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <MaterialCommunityIcons name="check-circle-outline" size={13} color={redesign.color.successText} />
                      <Text style={{ color: redesign.color.successText, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '700' }}>Up to date</Text>
                    </View>
                  )
                ) : null}
              </View>
              <CampaignCard
                campaign={item.campaign}
                badge={appStatus === 'active' ? badgeCounts[item.campaign.id] : undefined}
                onPress={() => router.push(campaignRouteParams(item.campaign) as never)}
              />
            </View>
          )
        }}
      />
    </Screen>
  )
}
