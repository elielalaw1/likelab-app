import { colors, palette, shadows, typography } from '@/features/core/theme'
import { useDeliverables } from '@/features/deliverables/hooks'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonDeliverableCard } from '@/features/shared/ui/SkeletonCard'
import { StatusBadge } from '@/features/shared/ui/StatusBadge'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

export default function DeliverablesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useDeliverables()

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['deliverables'] })
    await refetch()
  }, [queryClient, refetch])

  const needsAction = useMemo(() => {
    const actionable = (data || []).filter((item) => item.status === 'revision_requested' || item.status === 'pending')
    const grouped = new Map<
      string,
      {
        campaignId: string
        campaignTitle: string
        status: 'revision_requested' | 'pending'
        platform: string
        count: number
        flagReason?: string | null
      }
    >()

    for (const item of actionable) {
      const actionableStatus = item.status === 'revision_requested' ? 'revision_requested' : 'pending'
      const existing = grouped.get(item.campaignId)
      if (!existing) {
        grouped.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignTitle: item.campaignTitle,
          status: actionableStatus,
          platform: item.platform || 'tiktok',
          count: 1,
          flagReason: item.flagReason,
        })
        continue
      }

      existing.count += 1
      if (existing.status !== 'revision_requested' && actionableStatus === 'revision_requested') {
        existing.status = 'revision_requested'
      }
      if (!existing.flagReason && item.flagReason) {
        existing.flagReason = item.flagReason
      }
    }

    return Array.from(grouped.values())
  }, [data])

  const openCampaignVideos = (campaignId: string) =>
    router.push({
      pathname: '/campaigns/[id]',
      params: { id: campaignId, tab: 'videos' },
    })

  return (
    <Screen onRefresh={onRefresh}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: typography.sizes.pageTitle, fontWeight: '700', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -0.32 }}>
          My Projects
        </Text>
        <Text style={{ color: palette.textMuted, fontSize: typography.sizes.subtitle, fontFamily: typography.fontFamily }}>
          Submit and track your content deliverables
        </Text>
      </Animated.View>

      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load deliverables right now.</Text> : null}

      {isLoading ? (
        <>
          <SkeletonDeliverableCard />
          <SkeletonDeliverableCard />
          <SkeletonDeliverableCard />
        </>
      ) : null}

      <FlatList
        data={needsAction}
        keyExtractor={(item) => item.campaignId}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="Nothing Needs Action"
              subtitle="When a deliverable needs submission or revision, it will appear here."
              icon="package-variant-closed"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openCampaignVideos(item.campaignId)}
            style={{
              borderRadius: 22,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: item.status === 'revision_requested' ? 'rgba(251,191,36,0.45)' : 'rgba(191,219,254,0.8)',
              padding: 16,
              gap: 10,
              ...shadows.card,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1, color: palette.text, fontFamily: typography.fontFamily, fontSize: 17, fontWeight: '700' }}>
                {item.campaignTitle}
              </Text>
              <StatusBadge status={item.status} />
            </View>

            <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 13 }}>
              {`${item.platform || 'tiktok'} - ${item.count} video${item.count === 1 ? '' : 's'}`}
            </Text>

            {item.flagReason ? (
              <Text style={{ color: '#9A3412', fontFamily: typography.fontFamily, fontSize: 13, lineHeight: 19 }}>
                {item.flagReason}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>
                Open in Your Videos
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  )
}
