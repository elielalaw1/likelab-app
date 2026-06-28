import { redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useDeliverables, useUnreadFeedbackCounts } from '@/features/deliverables/hooks'
import { EmptyState } from '@/features/shared/ui/EmptyState'
import { Screen } from '@/features/shared/ui/Screen'
import { SkeletonStudioCard } from '@/features/shared/ui/SkeletonCard'
import { PressableScale } from '@/features/shared/ui/PressableScale'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useCampaigns } from '@/features/campaigns/hooks'
import { deliverableStage, type DeliverableStage } from '@/features/deliverables/stage'
import { getDaysLeft } from '@/features/core/format'
import type { Campaign } from '@/features/core/types'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

const STAGE_CARD: Record<DeliverableStage, { label: string; color: string; cta: string; waiting: string }> = {
  revision:     { label: 'Changes requested', color: '#FB923C', cta: 'Re-upload',     waiting: '' },
  upload:       { label: 'Your turn',          color: '#60A5FA', cta: 'Upload video',  waiting: '' },
  submit_link:  { label: 'Approved',           color: '#34D399', cta: 'Post the link', waiting: '' },
  under_review: { label: 'In review',          color: '#A78BFA', cta: '',              waiting: 'The brand is reviewing your work' },
  live:         { label: 'Live',               color: '#38BDF8', cta: '',              waiting: 'All videos are live 🎉' },
}

const PRIORITY: DeliverableStage[] = ['revision', 'upload', 'submit_link', 'under_review', 'live']
const PRIORITY_ORDER: Record<DeliverableStage, number> = { revision: 0, upload: 1, submit_link: 2, under_review: 3, live: 4 }

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
      const stage = deliverableStage(d)
      let c = byId.get(d.campaignId)
      if (!c) {
        c = { campaignId: d.campaignId, title: d.campaignTitle, total: 0, submitted: 0, stages: new Set(), counts: {} }
        byId.set(d.campaignId, c)
      }
      c.total += 1
      if (stage !== 'upload' && stage !== 'revision') c.submitted += 1
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
    const pct = c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0
    const days = c.endDate ? getDaysLeft(c.endDate) : null
    const deadlineLabel = days == null ? null : days <= 0 ? 'Last day' : `${days}d left`
    const urgent = days != null && days <= 3
    const cta = c.actionCount > 1 ? `${ui.cta} · ${c.actionCount} left` : ui.cta
    return (
      <Animated.View key={c.campaignId} entering={FadeInDown.delay(index * 50).duration(300)}>
        <PressableScale onPress={() => openCampaignVideos(c.campaignId)} style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: redesign.color.ink, ...redesign.shadow.cta }}>
          {c.cover ? <ExpoImage source={{ uri: c.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : null}
          <LinearGradient colors={['rgba(11,11,15,0.52)', 'rgba(11,11,15,0.93)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          {!c.cover ? (
            <LinearGradient colors={['rgba(124,63,242,0.5)', 'rgba(124,63,242,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.7 }} style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: 100 }} />
          ) : null}

          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingLeft: 8, paddingRight: 11, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ui.color }} />
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800' }}>{ui.label}</Text>
              </View>
              {c.unread > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(124,63,242,0.42)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <MaterialCommunityIcons name="message-text" size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{c.unread} new</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              {deadlineLabel ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: urgent ? 'rgba(251,146,60,0.92)' : 'rgba(255,255,255,0.16)' }}>
                  <MaterialCommunityIcons name={urgent ? 'clock-alert-outline' : 'clock-outline'} size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{deadlineLabel}</Text>
                </View>
              ) : null}
            </View>

            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 21, fontWeight: '800', letterSpacing: -0.5, lineHeight: 25 }} numberOfLines={2}>{c.title}</Text>

            <View style={{ gap: 7 }}>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999 }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{c.submitted} of {c.total} submitted</Text>
            </View>

            <View style={{ marginTop: 2, minHeight: 48, borderRadius: 14, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800' }}>{cta}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color={redesign.color.ink} />
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
            <View style={{ width: 54, height: 54, borderRadius: 13, backgroundColor: 'rgba(124,63,242,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={redesign.color.purple} />
            </View>
          )}
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>{c.title}</Text>
              {c.unread > 0 ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: redesign.color.purple }} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(124,63,242,0.10)' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: redesign.color.purple }} />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.purple }}>In review</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, height: 5, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
                <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.max(pct, 3)}%`, borderRadius: 999 }} />
              </View>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontVariant: ['tabular-nums'] }}>{c.submitted}/{c.total}</Text>
            </View>
          </View>
        </PressableScale>
      </Animated.View>
    )
  }

  // Tertiary: completed campaigns fold into compact rows that lead to the campaign's
  // ranking — "see your result" rather than just a Live tag.
  const renderCompleted = (c: CampaignCard) => (
    <PressableScale
      key={c.campaignId}
      onPress={() => router.push(`/leaderboard/${c.campaignId}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 10, ...redesign.shadow.card }}
    >
      {c.cover ? (
        <View style={{ width: 40, height: 40, borderRadius: 11, overflow: 'hidden', backgroundColor: redesign.color.hairlineStrong }}>
          <ExpoImage source={{ uri: c.cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </View>
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(14,165,233,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="star-circle-outline" size={20} color="#0EA5E9" />
        </View>
      )}
      <Text style={{ flex: 1, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }} numberOfLines={1}>{c.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 8, paddingRight: 10, paddingVertical: 4, backgroundColor: 'rgba(251,191,36,0.14)' }}>
        <MaterialCommunityIcons name="trophy-outline" size={12} color="#B45309" />
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: '#B45309' }}>Result</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={redesign.color.faint} />
    </PressableScale>
  )

  const activeCount = yourMove.length + inReview.length
  const Label = ({ children }: { children: string }) => (
    <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase' }}>{children}</Text>
  )

  return (
    <Screen onRefresh={onRefresh} bgColor={redesign.color.bg} headerOverlay>

      <Animated.View entering={FadeInDown.duration(250)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Projects
        </Text>
        {cards.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={14} color={redesign.color.purple} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: redesign.color.muted, fontFamily: typography.fontFamily }}>{activeCount} active</Text>
            </View>
            <Text style={{ color: redesign.color.faint, fontSize: 13 }}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MaterialCommunityIcons name="star-circle-outline" size={14} color="#0EA5E9" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: redesign.color.muted, fontFamily: typography.fontFamily }}>{liveVideos} live</Text>
            </View>
          </View>
        ) : (
          <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
            Your active work and history
          </Text>
        )}
      </Animated.View>

      {error ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>Could not load deliverables right now.</Text> : null}

      {isLoading ? (
        <>
          <SkeletonStudioCard />
          <SkeletonStudioCard />
        </>
      ) : null}

      {!isLoading && cards.length === 0 ? (
        <EmptyState title="No active campaigns" subtitle="When you're accepted to a campaign, your videos to film and submit will show up here." icon="video-outline" />
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
          {completed.map(renderCompleted)}
        </View>
      ) : null}
    </Screen>
  )
}
