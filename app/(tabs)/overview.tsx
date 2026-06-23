import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { redesign, typography } from '@/features/core/theme'
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
import { haptic } from '@/features/shared/haptics'


export default function ProjectsPage() {
  const { palette } = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch: refetchCampaigns } = useCampaigns()
  const applyMutation = useApplyToCampaign()
  const { data: profile } = useCreatorProfile()
  const isApproved = profile?.approved === true
  const { data: deliverables, refetch: refetchDeliverables } = useDeliverables()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [category, setCategory] = useState<string>('all')
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
  const browsableAll = useMemo(
    () =>
      (data || []).filter(
        (c) =>
          c.creatorApplicationStatus !== 'accepted' &&
          c.creatorApplicationStatus !== 'rejected' &&
          c.status === 'published'
      ),
    [data]
  )
  // Category chips are derived from real campaign data — "All" plus any distinct
  // categories present. (No category field exists yet, so only "All" renders
  // until the backend exposes one.)
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const c of browsableAll) {
      const cat = (c as { category?: string | null }).category
      if (cat) set.add(cat)
    }
    return ['all', ...Array.from(set)]
  }, [browsableAll])
  const browsable = useMemo(
    () =>
      category === 'all'
        ? browsableAll
        : browsableAll.filter((c) => (c as { category?: string | null }).category === category),
    [browsableAll, category]
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
    <Screen onRefresh={onRefresh} scrollRef={scrollRef} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Discover
        </Text>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Apply to campaigns. Compete. Get paid.
        </Text>
      </Animated.View>

      {/* Category filter chips */}
      {categories.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          style={{ marginHorizontal: -2 }}
        >
          {categories.map((cat) => {
            const active = category === cat
            const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)
            return (
              <Pressable
                key={cat}
                onPress={() => { haptic.selection(); setCategory(cat) }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: active ? redesign.color.ink : redesign.color.card,
                  borderWidth: active ? 0 : StyleSheet.hairlineWidth,
                  borderColor: redesign.color.hairlineStrong,
                }}
              >
                <Text style={{ color: active ? '#fff' : redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}

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
            onPress={() => { haptic.selection(); setViewMode((v) => (v === 'list' ? 'grid' : 'list')) }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: isGrid ? 'rgba(8,8,12,0.96)' : 'rgba(255,255,255,0.60)',
              borderWidth: 0.5,
              borderColor: isGrid ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,1)',
              shadowColor: isGrid ? '#000' : '#6040A0',
              shadowOpacity: isGrid ? 0.20 : 0.10,
              shadowRadius: isGrid ? 12 : 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={isGrid ? 'view-list-outline' : 'view-grid-outline'}
              size={18}
              color={isGrid ? 'rgba(255,255,255,0.95)' : 'rgba(28,28,30,0.55)'}
            />
          </Pressable>
        </View>
      )}

      {browsable.length > 0 && (
        <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily }}>
          Open now · {browsable.length}
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
          <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily, marginTop: browsable.length ? 4 : 0 }}>
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
