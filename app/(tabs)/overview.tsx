import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { screenGradients, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useApplyToCampaign, useCampaigns } from '@/features/campaigns/hooks'
import { useDeliverables } from '@/features/deliverables/hooks'
import { useCreatorProfile } from '@/features/profile/hooks'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { SkeletonCampaignCard } from '@/features/shared/ui/SkeletonCard'
import { campaignRouteParams } from '@/features/campaigns/navigation'
import { scrollEvents } from '@/features/navigation/scrollEvents'
import { useQueryClient } from '@tanstack/react-query'


export default function ProjectsPage() {
  const { colors, palette } = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch: refetchCampaigns } = useCampaigns()
  const applyMutation = useApplyToCampaign()
  const { data: profile } = useCreatorProfile()
  const isApproved = profile?.approved === true
  const { data: deliverables, refetch: refetchDeliverables } = useDeliverables()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    const unsub = scrollEvents.on('scrollToTop:overview', () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    })
    return unsub
  }, [])

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
  const browsable = useMemo(
    () => (data || []).filter((c) => c.creatorApplicationStatus !== 'accepted' && c.creatorApplicationStatus !== 'rejected'),
    [data]
  )

  const browseRows = useMemo(
    () => Array.from({ length: Math.ceil(browsable.length / 2) }, (_, i) => browsable.slice(i * 2, i * 2 + 2)),
    [browsable]
  )
  const acceptedRows = useMemo(
    () => Array.from({ length: Math.ceil(accepted.length / 2) }, (_, i) => accepted.slice(i * 2, i * 2 + 2)),
    [accepted]
  )

  const isGrid = viewMode === 'grid'

  return (
    <Screen onRefresh={onRefresh} scrollRef={scrollRef} gradient={screenGradients.discover}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 42, fontWeight: '300', color: palette.textMuted, fontFamily: typography.fontFamilyLight, letterSpacing: -1.5, lineHeight: 46 }}>
          Discover
        </Text>
        <Text style={{ fontSize: 42, fontWeight: '800', color: palette.text, fontFamily: typography.fontFamily, letterSpacing: -1.5, lineHeight: 46 }}>
          campaigns
        </Text>
      </Animated.View>

      {isLoading ? (
        <>
          <SkeletonCampaignCard />
          <SkeletonCampaignCard />
        </>
      ) : null}
      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load campaigns right now.</Text> : null}

      {/* View toggle */}
      {browsable.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: isGrid ? colors.primary : 'rgba(15,23,42,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={isGrid ? 'view-list-outline' : 'view-grid-outline'}
              size={18}
              color={isGrid ? '#fff' : palette.textMuted}
            />
          </Pressable>
        </View>
      )}

      {browsable.length > 0 && (
        <Text style={{ fontSize: 11, fontWeight: '700', color: palette.textMuted, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
          Available ({browsable.length})
        </Text>
      )}

      {isGrid ? (
        <View style={{ gap: 10 }}>
          {browsable.length === 0 && !isLoading ? (
            <EmptyState title="No Campaigns" subtitle="No new campaigns available right now." icon="bullhorn-outline" />
          ) : null}
          {browseRows.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((item) => (
                <View key={item.id} style={{ flex: 1 }}>
                  <CampaignCard
                    campaign={item}
                    compact
                    onPress={() => router.push(campaignRouteParams(item) as never)}
                  />
                </View>
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={browsable}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={!isLoading ? <EmptyState title="No Campaigns" subtitle="No new campaigns available right now." icon="bullhorn-outline" /> : null}
          renderItem={({ item, index }) => (
            <CampaignCard
              campaign={item}
              index={index}
              onPress={() => router.push(campaignRouteParams(item) as never)}
              onApply={() => {
                if (!isApproved) {
                  Alert.alert('Awaiting approval', 'Your account is pending review. You\'ll be able to apply once approved.')
                  return false
                }
                applyMutation.mutate(item.id)
              }}
            />
          )}
        />
      )}

      {accepted.length > 0 && (
        <>
          <Text style={{ fontSize: 11, fontWeight: '700', color: palette.textMuted, letterSpacing: 0.88, textTransform: 'uppercase', fontFamily: typography.fontFamily, marginTop: browsable.length ? 4 : 0 }}>
            My Active
          </Text>
          {isGrid ? (
            <View style={{ gap: 10 }}>
              {acceptedRows.map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  {row.map((item) => (
                    <View key={item.id} style={{ flex: 1 }}>
                      <CampaignCard
                        campaign={item}
                        compact
                        badge={badgeCounts[item.id]}
                        onPress={() => router.push(campaignRouteParams(item) as never)}
                      />
                    </View>
                  ))}
                  {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                </View>
              ))}
            </View>
          ) : (
            <FlatList
              data={accepted}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item, index }) => (
                <CampaignCard
                  campaign={item}
                  index={index}
                  badge={badgeCounts[item.id]}
                  onPress={() => router.push(campaignRouteParams(item) as never)}
                />
              )}
            />
          )}
        </>
      )}
    </Screen>
  )
}
