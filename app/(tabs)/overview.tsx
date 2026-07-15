import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/features/shared/ui/Screen'
import { redesign, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useApplyToCampaign, useCampaigns } from '@/features/campaigns/hooks'
import { isCampaignHiddenFromList } from '@/features/campaigns/phase'
import { isCampaignClosed } from '@/features/core/format'
import { useDeliverables } from '@/features/deliverables/hooks'
import { useCreatorProfile, useReputation } from '@/features/profile/hooks'
import { isProfileComplete } from '@/features/profile/api'
import { isAwaitingLink } from '@/features/deliverables/api'
import { CampaignCard } from '@/features/shared/ui/CampaignCard'
import { FeaturedCampaign } from '@/features/campaigns/ui/DiscoverSections'
import { ActiveCampaignDeck } from '@/features/campaigns/ui/ActiveCampaignDeck'
import { TermsSheet } from '@/features/campaigns/ui/TermsSheet'
import { TierRow } from '@/features/profile/ui/TierBadge'
import { SkeletonCampaignCard } from '@/features/shared/ui/SkeletonCard'
import { ScreenHeader } from '@/features/shared/ui/ScreenHeader'
import { campaignRouteParams } from '@/features/campaigns/navigation'
import { navigateOnce } from '@/lib/navigate-once'
import { scrollEvents } from '@/features/navigation/scrollEvents'
import { useQueryClient } from '@tanstack/react-query'
import { haptic } from '@/features/shared/haptics'
import { toast } from '@/features/shared/ui/Toast'


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
  // Quick-apply from the card used to skip the Terms gate entirely (only the
  // campaign-detail apply flow showed it) — same action, inconsistent consent.
  // Bridges CampaignCard's promise-based onApply to the same TermsSheet used on
  // the detail screen: open it, then resolve/reject the pending apply based on
  // accept/cancel.
  const [termsCampaignId, setTermsCampaignId] = useState<string | null>(null)
  const termsResolveRef = useRef<((accepted: boolean) => void) | null>(null)
  const resolveTerms = (accepted: boolean) => {
    termsResolveRef.current?.(accepted)
    termsResolveRef.current = null
    setTermsCampaignId(null)
  }

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
      if (d.status === 'pending' || d.status === 'revision_requested' || isAwaitingLink(d)) {
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
          c.status === 'published' &&
          !isCampaignClosed(c.endDate) &&
          !isCampaignHiddenFromList(c.phase, c.creatorApplicationStatus)
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

  // Top campaign becomes the editorial featured hero; the rest fill the list/grid.
  const featured = browsable.length > 0 ? browsable[0] : null
  const rest = useMemo(() => (browsable.length > 1 ? browsable.slice(1) : []), [browsable])
  const { width: winW } = useWindowDimensions()
  const gridItemW = Math.floor((winW - 16 * 2 - 10) / 2)
  const { tier } = useReputation()

  const isGrid = viewMode === 'grid'

  return (
    <>
    <Screen onRefresh={onRefresh} scrollRef={scrollRef} bgColor={redesign.color.bg} headerOverlay>

      <ScreenHeader
        eyebrow={browsable.length > 0 ? `${browsable.length} live ${browsable.length === 1 ? 'campaign' : 'campaigns'}` : undefined}
        eyebrowDot
        title="Discover"
        subtitle="Apply to campaigns. Compete. Get paid."
      />

      {/* In-progress campaigns — what a returning creator cares about first */}
      <ActiveCampaignDeck campaigns={accepted} badgeCounts={badgeCounts} onPress={(c) => navigateOnce(campaignRouteParams(c) as never)} />

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

      {browsable.length > 0 ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', color: redesign.color.muted, letterSpacing: -0.1, fontFamily: typography.fontFamily }}>
            Open now · {browsable.length}
          </Text>

          {featured ? (
            <FeaturedCampaign campaign={featured} onPress={() => navigateOnce(campaignRouteParams(featured) as never)} />
          ) : null}

          {rest.length > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: redesign.color.muted, letterSpacing: -0.1, fontFamily: typography.fontFamily }}>
                  More · {rest.length}
                </Text>
                <Pressable
                  onPress={() => { haptic.selection(); setViewMode((v) => (v === 'list' ? 'grid' : 'list')) }}
                  style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isGrid ? 'rgba(8,8,12,0.96)' : 'rgba(255,255,255,0.60)', borderWidth: 0.5, borderColor: isGrid ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,1)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name={isGrid ? 'view-list-outline' : 'view-grid-outline'} size={18} color={isGrid ? 'rgba(255,255,255,0.95)' : 'rgba(28,28,30,0.55)'} />
                </Pressable>
              </View>

              {/* Re-keying on the view mode remounts the cards, replaying their built-in
                  staggered FadeInDown — a calm cascade into the new layout instead of a
                  chaotic full-morph (cards change content AND size between modes). */}
              <View key={viewMode} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {rest.map((item, index) => (
                  <View
                    key={item.id}
                    style={{ width: isGrid ? gridItemW : '100%' }}
                  >
                    <CampaignCard
                      campaign={item}
                      compact={isGrid}
                      index={index}
                      applyGate={!isApproved ? 'Awaiting approval' : (!profile || !isProfileComplete(profile)) ? 'Complete profile to apply' : undefined}
                      onPress={() => navigateOnce(campaignRouteParams(item) as never)}
                      onApply={async () => {
                        if (!isApproved) {
                          toast.error('Your creator account must be approved before applying.')
                          return false
                        }
                        if (!profile || !isProfileComplete(profile)) {
                          toast.error('Complete your profile before applying.')
                          return false
                        }
                        // Same Terms gate as the campaign-detail apply flow — quick-apply
                        // from this card used to skip it, applying with zero consent step.
                        const accepted = await new Promise<boolean>((resolve) => {
                          termsResolveRef.current = resolve
                          setTermsCampaignId(item.id)
                        })
                        if (!accepted) return false
                        try {
                          await applyMutation.mutateAsync(item.id)
                          return true
                        } catch {
                          // Failure is surfaced centrally via the mutation's onError toast.
                          return false
                        }
                      }}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : error && !isLoading ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 14, backgroundColor: redesign.color.card, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 20, ...redesign.shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(239,68,68,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="wifi-off" size={22} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 }}>Couldn&apos;t load campaigns</Text>
              <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 2 }}>Check your connection and try again.</Text>
            </View>
          </View>
          <Pressable onPress={() => refetchCampaigns()} style={{ minHeight: 44, borderRadius: 13, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800' }}>Try again</Text>
          </Pressable>
        </Animated.View>
      ) : !isLoading ? (
        <Animated.View entering={FadeInDown.duration(300)} style={{ gap: 14, backgroundColor: redesign.color.card, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 20, ...redesign.shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="bell-badge-outline" size={23} color={redesign.color.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3 }}>No open campaigns right now</Text>
              <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 2 }}>We&apos;ll notify you the moment a new one drops. Meanwhile, keep your standing climbing.</Text>
            </View>
          </View>
          <TierRow progress={tier} onPress={() => router.push('/tiers')} />
        </Animated.View>
      ) : null}
    </Screen>
    <TermsSheet
      visible={termsCampaignId !== null}
      onAccept={() => resolveTerms(true)}
      onClose={() => resolveTerms(false)}
    />
    </>
  )
}
