import { redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables, useUnreadFeedbackCounts } from '@/features/deliverables/hooks'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonDeliverableCard } from '@/features/shared/ui/SkeletonCard'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { DeliverableStatus } from '@/features/core/types'
import { CountUp } from '@/features/motion/springs'
import { isAwaitingLink } from '@/features/deliverables/api'

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
  const { palette } = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useDeliverables()
  const { data: unreadFeedback } = useUnreadFeedbackCounts()

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['deliverables'] }),
      queryClient.invalidateQueries({ queryKey: ['feedback-unread'] }),
    ])
    await refetch()
  }, [queryClient, refetch])

  // Unread brand-feedback totals per campaign (summed across that campaign's deliverables)
  // — drives the "N new feedback" badge on the action cards.
  const unreadByCampaign = useMemo(() => {
    const map = new Map<string, number>()
    if (!unreadFeedback) return map
    for (const item of data || []) {
      const n = unreadFeedback[item.id] || 0
      if (n > 0) map.set(item.campaignId, (map.get(item.campaignId) || 0) + n)
    }
    return map
  }, [data, unreadFeedback])

  // Per-campaign totals (for the progress bar): total deliverables and how many
  // have already been submitted (i.e. not pending / revision-requested).
  const campaignTotals = useMemo(() => {
    const totals = new Map<string, { total: number; submitted: number }>()
    for (const item of data || []) {
      const entry = totals.get(item.campaignId) || { total: 0, submitted: 0 }
      entry.total += 1
      if (item.status !== 'pending' && item.status !== 'revision_requested') entry.submitted += 1
      totals.set(item.campaignId, entry)
    }
    return totals
  }, [data])

  const needsAction = useMemo(() => {
    const actionable = (data || []).filter((item) => item.status === 'revision_requested' || item.status === 'pending')
    const grouped = new Map<string, {
      campaignId: string
      campaignTitle: string
      status: 'revision_requested' | 'pending'
      platform: string
      count: number
      total: number
      submitted: number
      flagReason?: string | null
    }>()

    for (const item of actionable) {
      const actionableStatus = item.status === 'revision_requested' ? 'revision_requested' : 'pending'
      const existing = grouped.get(item.campaignId)
      if (!existing) {
        const totals = campaignTotals.get(item.campaignId) || { total: 1, submitted: 0 }
        grouped.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignTitle: item.campaignTitle,
          status: actionableStatus,
          platform: item.platform || 'tiktok',
          count: 1,
          total: totals.total,
          submitted: totals.submitted,
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
  }, [data, campaignTotals])

  // Approved deliverables that still need the creator to post on TikTok and paste
  // the link — surfaced as an explicit CTA instead of hiding in History.
  const readyToPost = useMemo(() => {
    const grouped = new Map<string, { campaignId: string; campaignTitle: string; platform: string; count: number }>()
    for (const item of data || []) {
      if (!isAwaitingLink(item)) continue
      const existing = grouped.get(item.campaignId)
      if (existing) { existing.count += 1; continue }
      grouped.set(item.campaignId, { campaignId: item.campaignId, campaignTitle: item.campaignTitle, platform: item.platform || 'tiktok', count: 1 })
    }
    return Array.from(grouped.values())
  }, [data])

  const history = useMemo(() =>
    (data || []).filter((item) => HISTORY_STATUSES.includes(item.status as DeliverableStatus) && !isAwaitingLink(item)),
    [data]
  )

  const openCampaignVideos = (campaignId: string) =>
    router.push({ pathname: '/campaigns/[id]', params: { id: campaignId, tab: 'videos' } })

  return (
    <Screen onRefresh={onRefresh} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Projects
        </Text>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Your active work and history
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
          const total = Math.max(item.total, item.submitted + item.count)
          const pct = total > 0 ? Math.round((item.submitted / total) * 100) : 0
          const unread = unreadByCampaign.get(item.campaignId) || 0
          return (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
              <Pressable onPress={() => openCampaignVideos(item.campaignId)}>
                <View style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: redesign.color.ink, ...redesign.shadow.cta }}>
                  {/* Purple radial glow in the corner */}
                  <LinearGradient
                    colors={['rgba(124,63,242,0.55)', 'rgba(124,63,242,0)']}
                    start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.7 }}
                    style={{ position: 'absolute', top: -30, right: -30, width: 220, height: 220, borderRadius: 110 }}
                  />
                  <View style={{ padding: 22, gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                        {isRevision ? 'Revision requested' : 'Active campaign'}
                      </Text>
                      {unread > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,63,242,0.30)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <MaterialCommunityIcons name="message-text" size={11} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', fontFamily: typography.fontFamily }}>
                            {unread} new feedback
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 26 }} numberOfLines={2}>
                      {item.campaignTitle}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                      <CountUp
                        value={item.count}
                        duration={600}
                        style={{
                          fontFamily: typography.fontFamily,
                          fontSize: 48,
                          fontWeight: '900',
                          color: isRevision ? redesign.color.gold : '#fff',
                          letterSpacing: -2,
                          lineHeight: 50,
                          padding: 0,
                          minWidth: 40,
                        }}
                      />
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)', paddingBottom: 6 }}>
                        {item.count === 1 ? 'video left to submit' : 'videos left to submit'}
                      </Text>
                    </View>
                    {/* Gradient progress bar */}
                    <View style={{ gap: 8 }}>
                      <View style={{ height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                        <LinearGradient
                          colors={redesign.gradient.accent}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999 }}
                        />
                      </View>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', fontVariant: ['tabular-nums'] }}>
                        {item.submitted} of {total} submitted
                      </Text>
                    </View>
                    {item.flagReason ? (
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 18 }}>{item.flagReason}</Text>
                    ) : null}
                    {/* White pill CTA */}
                    <Pressable
                      onPress={() => openCampaignVideos(item.campaignId)}
                      style={{ marginTop: 2, minHeight: 50, borderRadius: 999, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800' }}>Open &amp; submit</Text>
                      <MaterialCommunityIcons name="arrow-right" size={18} color={redesign.color.ink} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          )
        }}
      />

      {/* Ready to post — approved by the brand, just needs the TikTok link */}
      {readyToPost.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 12 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase' }}>
            Ready to post
          </Text>
          {readyToPost.map((item, index) => (
            <Animated.View key={item.campaignId} entering={FadeInDown.delay(index * 40).duration(250)}>
              <Pressable
                onPress={() => openCampaignVideos(item.campaignId)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(16,159,110,0.45)', padding: 14, ...redesign.shadow.card }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16,159,110,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color="#0F9F6E" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>
                    {item.campaignTitle}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', color: '#0F9F6E' }} numberOfLines={1}>
                    Approved — post on TikTok &amp; paste the link
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.count > 1 ? (
                    <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(16,159,110,0.16)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                      <Text style={{ color: '#0F9F6E', fontSize: 11, fontWeight: '800', fontFamily: typography.fontFamily }}>{item.count}</Text>
                    </View>
                  ) : null}
                  <MaterialCommunityIcons name="arrow-right" size={18} color={redesign.color.muted} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      {/* History — your past work, calm and scannable */}
      {history.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ gap: 12 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase' }}>
            History
          </Text>
          {history.map((item) => {
            const isLive = !!item.url && /^https?:\/\//i.test(item.url)
            const cfg = isLive
              ? { label: 'Live', color: '#0EA5E9', icon: 'star-circle-outline' as const }
              : STATUS_CONFIG[item.status] || { label: item.status, color: redesign.color.muted, icon: 'circle-outline' as const }
            return (
              <Pressable
                key={item.id}
                onPress={() => openCampaignVideos(item.campaignId)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 14, ...redesign.shadow.card }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${cfg.color}14`, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>
                    {item.campaignTitle}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '500', color: redesign.color.muted }}>
                    {item.platform ? `${item.platform.charAt(0).toUpperCase()}${item.platform.slice(1)}` : 'TikTok'}
                  </Text>
                </View>
                <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: `${cfg.color}14` }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
                </View>
              </Pressable>
            )
          })}
        </Animated.View>
      ) : null}
    </Screen>
  )
}
