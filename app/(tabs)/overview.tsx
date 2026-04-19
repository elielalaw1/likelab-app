import { FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useCallback, useMemo } from 'react'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { colors, palette, typography } from '@/features/core/theme'
import { useCampaigns } from '@/features/campaigns/hooks'
import { useDeliverables } from '@/features/deliverables/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { SkeletonCampaignCard } from '@/features/shared/ui/SkeletonCard'
import { campaignRouteParams } from '@/features/campaigns/navigation'
import { useQueryClient } from '@tanstack/react-query'

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch: refetchCampaigns } = useCampaigns()
  const { data: deliverables, refetch: refetchDeliverables } = useDeliverables()

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
      queryClient.invalidateQueries({ queryKey: ['deliverables'] }),
      refetchCampaigns(),
      refetchDeliverables(),
    ])
  }, [queryClient, refetchCampaigns, refetchDeliverables])

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const d of deliverables || []) {
      if (d.status === 'pending' || d.status === 'revision_requested') {
        counts[d.campaignId] = (counts[d.campaignId] || 0) + 1
      }
    }
    return counts
  }, [deliverables])

  const accepted = useMemo(() => (data || []).filter((c) => c.creatorApplicationStatus === 'accepted'), [data])
  const browsable = useMemo(() => (data || []).filter((c) => c.creatorApplicationStatus !== 'accepted'), [data])

  return (
    <Screen onRefresh={onRefresh}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          Browse Projects
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Discover and apply to brand campaigns
        </Text>
      </Animated.View>

      {isLoading ? (
        <>
          <SkeletonCampaignCard />
          <SkeletonCampaignCard />
        </>
      ) : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load campaigns right now.</Text> : null}

      {browsable.length > 0 && (
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
          Available
        </Text>
      )}

      <FlatList
        data={browsable}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={!isLoading ? <EmptyState title="No Campaigns" subtitle="No new campaigns available right now." icon="bullhorn-outline" /> : null}
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onPress={() => router.push(campaignRouteParams(item) as never)}
          />
        )}
      />

      {accepted.length > 0 && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.mutedForeground, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily, marginTop: browsable.length ? 4 : 0 }}>
            My Active
          </Text>
          <FlatList
            data={accepted}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => (
              <CampaignCard
                campaign={item}
                badge={badgeCounts[item.id]}
                onPress={() => router.push(campaignRouteParams(item) as never)}
              />
            )}
          />
        </>
      )}
    </Screen>
  )
}
