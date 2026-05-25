import { radii, shadows, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables } from '@/features/deliverables/hooks'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonDeliverableCard } from '@/features/shared/ui/SkeletonCard'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { DeliverableStatus } from '@/features/core/types'
import { CountUp } from '@/features/motion/springs'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  submitted:     { label: 'In review',  color: '#6366F1', icon: 'clock-outline' },
  pending_review:{ label: 'In review',  color: '#6366F1', icon: 'clock-outline' },
  uploaded:      { label: 'Uploaded',   color: '#6366F1', icon: 'upload-outline' },
  approved:      { label: 'Approved',   color: '#16A34A', icon: 'check-circle-outline' },
  published:     { label: 'Published',  color: '#0EA5E9', icon: 'star-circle-outline' },
  flagged:       { label: 'Flagged',    color: '#DC2626', icon: 'flag-outline' },
}

const HISTORY_STATUSES: DeliverableStatus[] = ['submitted', 'pending_review', 'uploaded', 'approved', 'published', 'flagged']

export default function DeliverablesPage() {
  const { colors, palette } = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useDeliverables()

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['deliverables'] })
    await refetch()
  }, [queryClient, refetch])

  const needsAction = useMemo(() => {
    const actionable = (data || []).filter((item) => item.status === 'revision_requested' || item.status === 'pending')
    const grouped = new Map<string, {
      campaignId: string
      campaignTitle: string
      status: 'revision_requested' | 'pending'
      platform: string
      count: number
      flagReason?: string | null
    }>()

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
      if (!existing.flagReason && item.flagReason) existing.flagReason = item.flagReason
    }

    return Array.from(grouped.values())
  }, [data])

  const history = useMemo(() =>
    (data || []).filter((item) => HISTORY_STATUSES.includes(item.status as DeliverableStatus)),
    [data]
  )

  const openCampaignVideos = (campaignId: string) =>
    router.push({ pathname: '/campaigns/[id]', params: { id: campaignId, tab: 'videos' } })

  return (
    <Screen onRefresh={onRefresh} wallpaper>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 42, fontWeight: '300', color: 'rgba(28,28,30,0.35)', fontFamily: typography.fontFamilyLight, letterSpacing: -1.5, lineHeight: 44 }}>
          My
        </Text>
        <Text style={{ fontSize: 42, fontWeight: '800', color: '#1C1C1E', fontFamily: typography.fontFamily, letterSpacing: -1.5, lineHeight: 44 }}>
          projects
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

      {/* Needs action */}
      <FlatList
        data={needsAction}
        keyExtractor={(item) => item.campaignId}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="You're all caught up!"
              subtitle="When you have videos to submit, they'll show up here."
              icon="check-circle-outline"
            />
          ) : null
        }
        renderItem={({ item, index }) => {
          const isRevision = item.status === 'revision_requested'
          return (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
              <Pressable onPress={() => openCampaignVideos(item.campaignId)}>
                <View style={{ borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: isRevision ? 'rgba(217,119,6,0.2)' : 'rgba(15,23,42,0.07)', ...shadows.hero }}>
                  <BlurView tint="light" intensity={60} style={{ position: 'absolute', inset: 0 }} />
                  <LinearGradient
                    colors={isRevision ? ['rgba(255,251,235,0.95)', 'rgba(255,255,255,0.88)'] : ['rgba(255,255,255,0.96)', 'rgba(248,250,252,0.88)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', inset: 0 }}
                  />
                  <View style={{ padding: spacing.lg + 4, gap: 14 }}>
                    <Text style={{ fontFamily: typography.fontFamilyLight, fontSize: 13, fontWeight: '300', color: palette.textMuted }} numberOfLines={1}>
                      {item.campaignTitle}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                      <CountUp
                        value={item.count}
                        duration={600}
                        style={{
                          fontFamily: typography.fontFamily,
                          fontSize: 48,
                          fontWeight: '800',
                          color: isRevision ? '#D97706' : '#0d0d1a',
                          letterSpacing: -2,
                          lineHeight: 52,
                          padding: 0,
                          minWidth: 40,
                        }}
                      />
                      <Text style={{ fontFamily: typography.fontFamilyLight, fontSize: 14, fontWeight: '300', color: palette.textMuted, paddingBottom: 8 }}>
                        {item.count === 1 ? 'video to submit' : 'videos to submit'}
                      </Text>
                    </View>
                    {isRevision ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={13} color="#D97706" />
                        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', color: '#D97706' }}>Revision requested</Text>
                      </View>
                    ) : null}
                    {item.flagReason ? (
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: '#9A3412', lineHeight: 18 }}>{item.flagReason}</Text>
                    ) : null}
                    <LiquidButton
                      label="Open & submit"
                      onPress={() => openCampaignVideos(item.campaignId)}
                      tone="primary"
                      minHeight={50}
                      borderRadius={14}
                      icon={<MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />}
                    />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )
        }}
      />

      {/* History */}
      {history.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={{ gap: 12 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', color: palette.textMuted, letterSpacing: 0.9, textTransform: 'uppercase' }}>
            History
          </Text>
          {history.map((item, index) => {
            const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: palette.textMuted, icon: 'circle-outline' as const }
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 40).duration(250)}>
                <Pressable
                  onPress={() => openCampaignVideos(item.campaignId)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: palette.cardBg,
                    borderRadius: radii.card,
                    borderWidth: 1,
                    borderColor: palette.borderSoft,
                    padding: 14,
                    ...shadows.card,
                  }}
                >
                  {/* Status icon */}
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${cfg.color}14`, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={cfg.icon} size={20} color={cfg.color} />
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700', color: palette.text }} numberOfLines={1}>
                      {item.campaignTitle}
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, color: palette.textMuted }}>
                      {item.platform ? `${item.platform.charAt(0).toUpperCase()}${item.platform.slice(1)}` : 'TikTok'}
                    </Text>
                  </View>

                  {/* Status pill */}
                  <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${cfg.color}14` }}>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', color: cfg.color }}>
                      {cfg.label}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            )
          })}
        </Animated.View>
      ) : null}
    </Screen>
  )
}
