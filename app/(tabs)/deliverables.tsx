import { redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables, useUnreadFeedbackCounts } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonStudioCard } from '@/features/shared/ui/SkeletonCard'
import { PressableScale } from '@/features/shared/ui/PressableScale'
import { ScreenHeader } from '@/features/shared/ui/ScreenHeader'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useCampaigns } from '@/features/campaigns/hooks'
import { resolveStage, STAGE_UI, type DeliverableStage } from '@/features/deliverables/stage'
import { getDaysLeft, isCampaignClosed } from '@/features/core/format'
import type { Campaign } from '@/features/core/types'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated'

// Projects-tab copy per stage. COLORS come from the canonical STAGE_UI (stage.ts)
// so a stage looks identical here and inside the campaign — the labels stay tuned to
// this aggregate view (status word here; the action itself lives on the CTA button).
const STAGE_CARD: Record<DeliverableStage, { label: string; cta: string }> = {
  revision:     { label: 'Changes requested', cta: 'Re-upload' },
  deliver:      { label: 'Your turn',          cta: 'Deliver' },
  upload:       { label: 'Your turn',          cta: 'Upload video' },
  submit_link:  { label: 'Approved',           cta: 'Post the link' },
  under_review: { label: 'In review',          cta: '' },
  live:         { label: 'Live',               cta: '' },
}

const PRIORITY: DeliverableStage[] = ['revision', 'deliver', 'upload', 'submit_link', 'under_review', 'live']
const PRIORITY_ORDER: Record<DeliverableStage, number> = { revision: 0, deliver: 1, upload: 2, submit_link: 3, under_review: 4, live: 5 }

type CampaignCard = {
  campaignId: string
  title: string
  total: number
  submitted: number
  top: DeliverableStage
  actionable: boolean
  actionCount: number
  cover: string | null
  endDate: string | null
  unread: number
}

export default function DeliverablesPage() {
  const { palette } = useTheme()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useDeliverables()
  const { data: unreadFeedback } = useUnreadFeedbackCounts()
  const { data: campaigns } = useCampaigns()

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['deliverables'] }),
      queryClient.invalidateQueries({ queryKey: ['feedback-unread'] }),
      // Cards derive stage/deadline/cover from useCampaigns (6h staleTime,
      // refetchOnMount:false), so refresh it too or those stay stale on pull.
      queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    ])
    await refetch()
  }, [queryClient, refetch])

  const campaignById = useMemo(() => {
    const map = new Map<string, Campaign>()
    for (const c of campaigns || []) map.set(c.id, c)
    return map
  }, [campaigns])

  const unreadByCampaign = useMemo(() => {
    const map = new Map<string, number>()
    if (!unreadFeedback) return map
    for (const item of data || []) {
      const n = unreadFeedback[item.id] || 0
      if (n > 0) map.set(item.campaignId, (map.get(item.campaignId) || 0) + n)
    }
    return map
  }, [data, unreadFeedback])

  // The campaign is the unit. Aggregate every deliverable into one card per campaign,
  // carrying its most-urgent stage, how many sit at that stage, and its progress.
  const cards = useMemo<CampaignCard[]>(() => {
    const byId = new Map<string, { campaignId: string; title: string; total: number; submitted: number; stages: Set<DeliverableStage>; counts: Partial<Record<DeliverableStage, number>> }>()
    for (const d of data || []) {
      const stage = resolveStage(d, campaignById.get(d.campaignId)?.requiresReview ?? true)
      let c = byId.get(d.campaignId)
      if (!c) {
        c = { campaignId: d.campaignId, title: d.campaignTitle, total: 0, submitted: 0, stages: new Set(), counts: {} }
        byId.set(d.campaignId, c)
      }
      c.total += 1
      if (stage !== 'upload' && stage !== 'revision' && stage !== 'deliver') c.submitted += 1
      c.stages.add(stage)
      c.counts[stage] = (c.counts[stage] || 0) + 1
    }
    return Array.from(byId.values()).map((c) => {
      const top = PRIORITY.find((p) => c.stages.has(p)) ?? 'live'
      const meta = campaignById.get(c.campaignId)
      return {
        campaignId: c.campaignId,
        title: c.title,
        total: c.total,
        submitted: c.submitted,
        top,
        actionable: top === 'revision' || top === 'upload' || top === 'submit_link',
        actionCount: c.counts[top] || 0,
        cover: meta?.coverImageUrl || null,
        endDate: meta?.endDate || null,
        unread: unreadByCampaign.get(c.campaignId) || 0,
      }
    })
  }, [data, campaignById, unreadByCampaign])

  const yourMove = useMemo(() => cards.filter((c) => c.actionable).sort((a, b) => PRIORITY_ORDER[a.top] - PRIORITY_ORDER[b.top]), [cards])
  const inReview = useMemo(() => cards.filter((c) => c.top === 'under_review'), [cards])
  const completed = useMemo(() => cards.filter((c) => c.top === 'live'), [cards])
  const liveVideos = useMemo(() => (data || []).filter((d) => (!!d.url && /^https?:\/\//i.test(d.url)) || d.status === 'published').length, [data])

  const openCampaignVideos = (campaignId: string) =>
    router.push({ pathname: '/campaigns/[id]', params: { id: campaignId, tab: 'videos' } })

  // Primary: the big, image-led card for a campaign that needs the creator now.
  const renderCard = (c: CampaignCard, index: number) => {
    const ui = STAGE_CARD[c.top]
    const stageColor = STAGE_UI[c.top].color
    const pct = c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0
    const closed = c.endDate ? isCampaignClosed(c.endDate) : false
    const days = c.endDate ? getDaysLeft(c.endDate) : null
    // getDaysLeft clamps past deadlines to 0, so check closed first — otherwise an
    // ended campaign shows an urgent red "Last day" forever.
    const deadlineLabel = closed ? 'Closed' : days == null ? null : days <= 0 ? 'Last day' : `${days}d left`
    const urgent = !closed && days != null && days <= 3
    const cta = c.actionCount > 1 ? `${ui.cta} · ${c.actionCount} left` : ui.cta
    return (
      <Animated.View key={c.campaignId} entering={FadeInDown.delay(index * 50).duration(300)} layout={LinearTransition.springify().damping(18)}>
        <PressableScale onPress={() => openCampaignVideos(c.campaignId)} style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.ink, ...redesign.shadow.cta }}>
          {c.cover ? <ExpoImage source={{ uri: c.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
          <LinearGradient colors={['rgba(11,11,15,0.52)', 'rgba(11,11,15,0.93)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          {!c.cover ? (
            <LinearGradient colors={['rgba(99,80,184,0.5)', 'rgba(99,80,184,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.7 }} style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: 100 }} />
          ) : null}

          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Animated.View key={`stage-${c.top}`} entering={ZoomIn.springify().damping(11).stiffness(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stageColor }} />
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>{ui.label}</Text>
              </Animated.View>
              {c.unread > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,80,184,0.42)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <MaterialCommunityIcons name="message-text" size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{c.unread} new</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              {deadlineLabel ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: urgent ? 'rgba(239,68,68,0.92)' : 'rgba(255,255,255,0.16)' }}>
                  <MaterialCommunityIcons name={urgent ? 'clock-alert-outline' : 'clock-outline'} size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{deadlineLabel}</Text>
                </View>
              ) : null}
            </View>

            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 21, fontWeight: '800', letterSpacing: -0.5, lineHeight: 25 }} numberOfLines={2}>{c.title}</Text>

            <View style={{ gap: 7 }}>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                <Animated.View layout={LinearTransition.springify().damping(18)} style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999, backgroundColor: redesign.color.purple }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{c.submitted} of {c.total} submitted</Text>
            </View>

            <View style={{ marginTop: 2, minHeight: 50, borderRadius: 15, paddingHorizontal: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>{cta}</Text>
              <View style={{ position: 'absolute', right: 7, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(11,11,15,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="arrow-top-right" size={17} color={redesign.color.ink} />
              </View>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    )
  }

  // Secondary: a calmer, compact light card for what's with the brand — no action, so
  // it sits below the big "Your move" cards in the hierarchy.
  const renderInReview = (c: CampaignCard, index: number) => {
    const pct = c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0
    return (
      <Animated.View key={c.campaignId} entering={FadeInDown.delay(index * 40).duration(260)}>
        <PressableScale onPress={() => openCampaignVideos(c.campaignId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 12, ...redesign.shadow.card }}>
          {c.cover ? (
            <View style={{ width: 54, height: 54, borderRadius: 13, overflow: 'hidden', backgroundColor: redesign.color.hairlineStrong }}>
              <ExpoImage source={{ uri: c.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            </View>
          ) : (
            <View style={{ width: 54, height: 54, borderRadius: 13, backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={redesign.color.purple} />
            </View>
          )}
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>{c.title}</Text>
              {c.unread > 0 ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: redesign.color.purple }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(99,80,184,0.10)' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: redesign.color.purple }} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.purple }}>In review</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999, backgroundColor: redesign.color.purple }} />
              </View>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>{c.submitted}/{c.total}</Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    )
  }

  // Tertiary: completed campaigns keep the same card shape as an active deliverable
  // — just with a "Completed" banner — and open the campaign's videos (where the
  // live performance/stats now live), rather than a separate ranking screen.
  const renderCompleted = (c: CampaignCard, index: number) => {
    const pct = c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0
    return (
      <Animated.View key={c.campaignId} entering={FadeInDown.delay(index * 40).duration(260)}>
        <PressableScale onPress={() => openCampaignVideos(c.campaignId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 12, ...redesign.shadow.card }}>
          {c.cover ? (
            <View style={{ width: 54, height: 54, borderRadius: 13, overflow: 'hidden', backgroundColor: redesign.color.hairlineStrong }}>
              <ExpoImage source={{ uri: c.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            </View>
          ) : (
            <View style={{ width: 54, height: 54, borderRadius: 13, backgroundColor: 'rgba(14,165,233,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#0EA5E9" />
            </View>
          )}
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>{c.title}</Text>
              {c.unread > 0 ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: redesign.color.purple }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(14,165,233,0.12)' }}>
                <MaterialCommunityIcons name="check-circle" size={12} color="#0EA5E9" />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: '#0EA5E9' }}>Completed</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999, backgroundColor: redesign.color.purple }} />
              </View>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>{c.submitted}/{c.total}</Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    )
  }

  const activeCount = yourMove.length + inReview.length
  const Label = ({ children }: { children: string }) => (
    <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase' }}>{children}</Text>
  )

  return (
    <Screen onRefresh={onRefresh} bgColor={redesign.color.bg} headerOverlay>

      <ScreenHeader
        eyebrow={cards.length > 0 ? `${activeCount} active · ${liveVideos} live` : undefined}
        eyebrowDot
        title="Projects"
        subtitle={cards.length > 0 ? undefined : 'Your active work and history'}
      />

      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load deliverables right now.</Text> : null}

      {isLoading ? (
        <>
          <SkeletonStudioCard />
          <SkeletonStudioCard />
        </>
      ) : null}

      {!isLoading && cards.length === 0 ? (
        <EmptyState title="No active campaigns" subtitle="When you're accepted to a campaign, your videos to film and submit will show up here." icon="video-outline" actionLabel="Browse campaigns" onAction={() => router.navigate('/(tabs)/overview')} />
      ) : null}

      {yourMove.length > 0 ? (
        <View style={{ gap: 14 }}>
          <Label>To do</Label>
          {yourMove.map((c, i) => renderCard(c, i))}
        </View>
      ) : null}

      {inReview.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Label>In motion</Label>
          {inReview.map((c, i) => renderInReview(c, i))}
        </View>
      ) : null}

      {completed.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Label>{`Completed · ${completed.length}`}</Label>
          {completed.map((c, i) => renderCompleted(c, i))}
        </View>
      ) : null}
    </Screen>
  )
}
