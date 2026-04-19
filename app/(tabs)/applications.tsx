import { useAcceptInvitation, useApplications, useDeclineInvitation } from '@/features/applications/hooks'
import { campaignRouteParams } from '@/features/campaigns/navigation'
import { colors, palette, shadows, typography } from '@/features/core/theme'
import { CreatorInvitation } from '@/features/core/types'
import { useDeliverables } from '@/features/deliverables/hooks'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonCampaignCard } from '@/features/shared/ui/SkeletonCard'
import { toast } from '@/features/shared/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
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
  const isClosed = label === 'Closed'

  return (
    <Pressable
      onPress={onPress}
      onLayout={(event) => onLayout(event.nativeEvent.layout.x, event.nativeEvent.layout.width)}
      style={{
        minWidth: 82,
        minHeight: 42,
        borderRadius: 18,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: active ? palette.text : palette.textMuted,
          fontFamily: typography.fontFamily,
          fontSize: 11,
          fontWeight: '700',
          textAlign: 'center',
          transform: [{ translateX: isClosed ? -10 : 0 }],
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
  const { data: deliverables } = useDeliverables()

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

  const deliverableCampaignIds = useMemo(() => new Set((deliverables || []).map((item) => item.campaignId)), [deliverables])
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

    const leftInset = activeFilter === 'closed' ? -5 : 4
    const rightInset = activeFilter === 'closed' ? 13 : 4
    const targetX = metric.x + leftInset
    const targetWidth = Math.max(0, metric.width - leftInset - rightInset)

    bubbleX.value = withSpring(targetX, {
      damping: 18,
      stiffness: 210,
      mass: 0.7,
    })
    bubbleWidth.value = withSpring(targetWidth, {
      damping: 18,
      stiffness: 210,
      mass: 0.7,
    })
    bubbleScale.value = withSequence(withTiming(1.06, { duration: 120 }), withTiming(1, { duration: 180 }))
  }, [activeFilter, bubbleScale, bubbleWidth, bubbleX, tabMetrics])

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bubbleX.value }, { scale: bubbleScale.value }],
    width: bubbleWidth.value,
  }))


  return (
    <Screen onRefresh={onRefresh}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)} style={{ gap: 8 }}>
        <Text style={{ fontSize: 38, lineHeight: 42, fontWeight: '800', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -1 }}>
          My Applications
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: 16, fontFamily: typography.fontFamily }}>
          Invitations, accepted campaigns and everything still in motion.
        </Text>
      </Animated.View>

      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load applications right now.</Text> : null}

      <View
        style={{
          borderRadius: 24,
          backgroundColor: 'rgba(248,250,252,0.56)',
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.08)',
          paddingHorizontal: 6,
          paddingVertical: 8,
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
          style={{ position: 'absolute', left: 1, right: 1, top: 1, height: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.06)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: 5,
                height: 34,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.86)',
                shadowColor: 'rgba(109,40,217,1)',
                shadowOpacity: 0.18,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
              },
              bubbleStyle,
            ]}
          >
            <BlurView tint="light" intensity={48} style={{ position: 'absolute', inset: 0 }} />
            <LinearGradient
              colors={['rgba(255,255,255,0.72)', 'rgba(239,233,255,0.52)', 'rgba(228,246,255,0.32)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ flex: 1, borderRadius: 18 }}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
              start={{ x: 0.08, y: 0.02 }}
              end={{ x: 0.88, y: 0.72 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 18 }}
            />
            <LinearGradient
              colors={['rgba(139,92,246,0.16)', 'rgba(56,189,248,0.1)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', inset: 0, borderRadius: 18 }}
            />
          </Animated.View>
          <FilterTab label="All" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, all: { x, width } }))} />
          <FilterTab label="Accepted" active={activeFilter === 'accepted'} onPress={() => setActiveFilter('accepted')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, accepted: { x, width } }))} />
          <FilterTab label="Pending" active={activeFilter === 'pending'} onPress={() => setActiveFilter('pending')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, pending: { x, width } }))} />
          <FilterTab label="Closed" active={activeFilter === 'closed'} onPress={() => setActiveFilter('closed')} onLayout={(x, width) => setTabMetrics((prev) => ({ ...prev, closed: { x, width } }))} />
        </ScrollView>
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
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: 'rgba(234,236,239,0.75)',
                padding: 14,
                ...shadows.card,
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
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
