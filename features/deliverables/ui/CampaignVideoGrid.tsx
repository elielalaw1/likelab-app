import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, FadeIn, ZoomIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import type { Deliverable } from '@/features/core/types'
import { getMyVideos, MyVideo } from '@/features/deliverables/api'
import { useUnreadFeedbackCounts } from '@/features/deliverables/hooks'
import { deliverableStage, resolveStage, STAGE_UI, type DeliverableStage } from '@/features/deliverables/stage'
import { CombinedDeliveryRow } from '@/features/shared/ui/CombinedDeliveryRow'
import { VideoUploadRow } from '@/features/shared/ui/VideoUploadRow'
import { LinkSubmitRow } from '@/features/shared/ui/LinkSubmitRow'
import { VideoReviewActions, ViewVideoButton } from '@/features/deliverables/ui/VideoReviewActions'
import { FeedbackButton } from '@/features/deliverables/ui/FeedbackChat'
import { tiktokApiFeaturesEnabled } from '@/features/core/flags'
import { TikTokVideoPicker } from '@/features/deliverables/ui/TikTokVideoPicker'
import { SendToTikTokButton } from '@/features/deliverables/ui/SendToTikTokButton'
import { DeliverablePerformance } from '@/features/deliverables/ui/DeliverablePerformance'

// Session-lived cache of on-device thumbnails, keyed by deliverable id.
const thumbCache = new Map<string, string>()

function platformLabel(p?: string | null) {
  if (!p) return 'TikTok'
  return p.replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

// A bold red feedback badge with an expanding halo + a beating core and a comment glyph
// — flags a video the brand has left unread feedback on, impossible to miss.
function FeedbackDot() {
  const halo = useSharedValue(0)
  const beat = useSharedValue(0)
  useEffect(() => {
    halo.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.ease) }), -1, false)
    beat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 640, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 640, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => {
      cancelAnimation(halo)
      cancelAnimation(beat)
    }
  }, [halo, beat])
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - halo.value), transform: [{ scale: 1 + halo.value * 1.9 }] }))
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + beat.value * 0.14 }] }))
  return (
    <View style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', zIndex: 6 }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444' }, haloStyle]} />
      <Animated.View
        style={[
          { width: 21, height: 21, borderRadius: 11, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
          coreStyle,
        ]}
      >
        <MaterialCommunityIcons name="comment-processing" size={11} color="#fff" />
      </Animated.View>
    </View>
  )
}

// One TikTok-style portrait tile — the uploaded video's poster (or a stage-tinted
// placeholder) with the video number + a status pill overlaid.
function VideoTile({
  deliverable,
  index,
  total,
  video,
  width,
  fullWidth,
  hasFeedback,
  requiresReview,
  onPress,
}: {
  deliverable: Deliverable
  index: number
  total: number
  video?: MyVideo
  width: number
  fullWidth?: boolean
  hasFeedback?: boolean
  requiresReview: boolean
  onPress: () => void
}) {
  const stage = resolveStage(deliverable, requiresReview)
  const ui = STAGE_UI[stage]
  const [genThumb, setGenThumb] = useState<string | null>(() => thumbCache.get(deliverable.id) ?? null)
  const thumb = video?.thumbnailUrl || genThumb

  useEffect(() => {
    if (!video || video.archived || video.thumbnailUrl || genThumb || !video.url) return
    let active = true
    VideoThumbnails.getThumbnailAsync(video.url, { time: 0, quality: 0.5 })
      .then(({ uri }) => {
        thumbCache.set(deliverable.id, uri)
        if (active) setGenThumb(uri)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [deliverable.id, video, genThumb])

  // A full-width tile reads as a prominent banner, so it uses a shorter landscape
  // ratio; the standard grid tiles stay portrait (TikTok-style) at 1.4×.
  const height = fullWidth ? Math.round(width * 0.58) : width * 1.4
  const ctaLabel = stage === 'submit_link' ? 'Post the link' : stage === 'revision' ? 'Re-upload' : 'Upload video'
  const ctaIcon: keyof typeof MaterialCommunityIcons.glyphMap = stage === 'submit_link' ? 'link-variant' : 'tray-arrow-up'

  // Gentle breathing pulse on the CTA so an actionable tile draws the eye.
  const pulse = useSharedValue(0)
  useEffect(() => {
    if (!ui.actionable) return
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => cancelAnimation(pulse)
  }, [ui.actionable, pulse])
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.04 }] }))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Video ${index + 1}, ${ui.label}`}
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#15151F',
        borderWidth: ui.actionable ? 1.5 : StyleSheet.hairlineWidth,
        borderColor: ui.actionable ? ui.color : 'rgba(255,255,255,0.08)',
      }}
    >
      {thumb ? (
        <ExpoImage source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient colors={[ui.glow, '#15151F']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      )}

      {/* bottom scrim so the status reads over any thumbnail */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' }} pointerEvents="none" />

      {/* number badge */}
      <View style={{ position: 'absolute', top: 8, left: 8, minWidth: 24, height: 24, borderRadius: 8, paddingHorizontal: 7, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '900' }}>{index + 1}</Text>
      </View>

      {/* tiktok badge when live — nudged left when a feedback dot shares the corner */}
      {video?.tiktokUrl ? (
        <View style={{ position: 'absolute', top: 8, right: hasFeedback ? 34 : 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome5 name="tiktok" size={11} color="#fff" />
        </View>
      ) : null}

      {/* unread brand-feedback dot */}
      {hasFeedback ? <FeedbackDot /> : null}

      {/* center affordance — colored action glyph (do this) for actionable tiles,
          a play glyph for ones that already have a video to watch */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: ui.actionable ? 46 : 30, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        {ui.actionable ? (
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: ui.color, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
            <MaterialCommunityIcons name={ui.icon} size={23} color="#fff" />
          </View>
        ) : thumb ? (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="play" size={22} color="#fff" />
          </View>
        ) : null}
      </View>

      {/* bottom — a clear tap-to-act CTA for actionable tiles, otherwise the status */}
      <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8, gap: 5 }}>
        {ui.actionable ? (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700', marginLeft: 2 }}>
              {`Video ${index + 1} of ${total}`}
            </Text>
            <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 9, backgroundColor: ui.color, shadowColor: ui.color, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, ctaStyle]}>
              <MaterialCommunityIcons name={ctaIcon} size={15} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '800', letterSpacing: -0.1 }}>{ctaLabel}</Text>
              <MaterialCommunityIcons name="chevron-right" size={15} color="#fff" />
            </Animated.View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 7, paddingRight: 10, paddingVertical: 4, backgroundColor: ui.color }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', letterSpacing: -0.1 }}>{ui.label}</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
              {`Video ${index + 1} of ${total}`}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  )
}

// The creator-facing journey, shown as a slim legend so the whole flow is legible
// at a glance: upload → brand review → approved → post the link → live.
type FlowStep = { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }
const FLOW: FlowStep[] = [
  { icon: 'tray-arrow-up', label: 'Upload' },
  { icon: 'eye-check-outline', label: 'Review' },
  { icon: 'check-decagram', label: 'Approved' },
  { icon: 'link-variant', label: 'Post link' },
  { icon: 'star-circle-outline', label: 'Live' },
]
// Standard (no-review) campaigns skip the pre-post review: post on TikTok, hand over the
// link + raw file, and it's live.
const DIRECT_FLOW: FlowStep[] = [
  { icon: 'video-outline', label: 'Post it' },
  { icon: 'send-outline', label: 'Link + raw' },
  { icon: 'star-circle-outline', label: 'Live' },
]

function FlowLegend({ requiresReview }: { requiresReview: boolean }) {
  const steps = requiresReview ? FLOW : DIRECT_FLOW
  return (
    <View style={{ backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingVertical: 13, paddingHorizontal: 12, ...redesign.shadow.card }}>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>How it works</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10 }}>
        {steps.map((s, i) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            <View style={{ alignItems: 'center', gap: 5, width: 52 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: redesign.color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={s.icon} size={15} color={redesign.color.purple} />
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center' }}>{s.label}</Text>
            </View>
            {i < steps.length - 1 ? <MaterialCommunityIcons name="chevron-right" size={15} color={redesign.color.faint} style={{ marginTop: 8 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  )
}

// Celebratory header for the approved → post stage. Getting approved is a real win,
// so we lead with it — posting then feels like the victory lap, not a grey chore.
function ApprovedHero({ brandName }: { brandName?: string | null }) {
  return (
    <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.successBg, borderRadius: 18, padding: 15 }}>
      <Animated.View entering={ZoomIn.springify().damping(11)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="trophy-variant" size={23} color={redesign.color.successText} />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 16.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>
          {brandName ? `${brandName} approved it! 🎉` : 'Approved! 🎉'}
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted, lineHeight: 17, marginTop: 1 }}>
          One step left — get it live on TikTok.
        </Text>
      </View>
    </Animated.View>
  )
}

// The finish line: the video is live in the world. A softly pulsing LIVE dot makes
// it feel current and alive; the stats below become the reward for coming back.
function LiveHero({ brandName }: { brandName?: string | null }) {
  const pulse = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })), -1, false)
    return () => cancelAnimation(pulse)
  }, [pulse])
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.55, transform: [{ scale: 1 + pulse.value * 0.5 }] }))

  return (
    <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 18, padding: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}>
      <Animated.View entering={ZoomIn.springify().damping(11)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,165,233,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="star-four-points" size={22} color="#0EA5E9" />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 16.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>You’re live</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(14,165,233,0.12)', borderRadius: 999, paddingLeft: 6, paddingRight: 8, paddingVertical: 3 }}>
            <Animated.View style={[dotStyle, { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0EA5E9' }]} />
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '900', color: '#0EA5E9', letterSpacing: 0.6 }}>LIVE</Text>
          </View>
        </View>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted, lineHeight: 17, marginTop: 1 }}>
          {brandName ? `Your video is out in the world for ${brandName}.` : 'Your video is out in the world — nice work.'}
        </Text>
      </View>
    </Animated.View>
  )
}

// A labelled sub-step so the "post it" options read as a clear sequence instead of
// a flat stack of three similar-looking controls.
function PostStep({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</Text>
      {children}
    </View>
  )
}

// Grid sections, ordered action-first so the videos that need the creator sit on
// top, then what's waiting on the brand, then what's done. Each maps to a stage;
// empty sections are skipped. Heading copy is clearer than the tiny pill labels.
const SECTION_ORDER: { stage: DeliverableStage; heading: string }[] = [
  { stage: 'revision', heading: 'Changes requested' },
  { stage: 'deliver', heading: 'Ready to deliver' },
  { stage: 'upload', heading: 'Ready to upload' },
  { stage: 'submit_link', heading: 'Approved — post the link' },
  { stage: 'under_review', heading: 'In review' },
  { stage: 'live', heading: 'Live' },
]

// TikTok-style video grid for the campaign's deliverables. Each tile shows the
// uploaded video (poster) + its status; tapping opens a bottom sheet with the one
// action that stage needs (reusing the existing upload / link / review controls).
export function CampaignVideoGrid({
  deliverables,
  brandName,
  brandLogoUrl,
  requiresReview = true,
  pagePadding = 16,
}: {
  deliverables: Deliverable[]
  brandName?: string | null
  brandLogoUrl?: string | null
  requiresReview?: boolean
  pagePadding?: number
}) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { data: myVideos } = useQuery({ queryKey: ['my-videos'], queryFn: getMyVideos, placeholderData: (prev) => prev })
  const { data: unreadFeedback } = useUnreadFeedbackCounts()
  const [openId, setOpenId] = useState<string | null>(null)

  const videoByDeliverable = useMemo(() => {
    const map = new Map<string, MyVideo>()
    for (const v of myVideos || []) if (!map.has(v.deliverableId)) map.set(v.deliverableId, v)
    return map
  }, [myVideos])

  // Action sheet as a plain RN Modal. We used a @gorhom BottomSheetModal here, but
  // its present() ran without error yet never rendered — on the New Architecture the
  // gorhom portal sits behind the native stack screen, so the sheet (and its backdrop)
  // were invisible. A RN Modal presents as a true native modal above everything and is
  // 100% reliable. Closing (backdrop tap / Done) funnels through closeSheet, the single
  // refresh chokepoint so tiles re-bucket to their new stage once the sheet is gone.
  const closeSheet = () => {
    setOpenId(null)
    // ['deliverables'] prefix-matches ['deliverables','campaign']; also refresh the profile feed.
    queryClient.invalidateQueries({ queryKey: ['deliverables'] })
    queryClient.invalidateQueries({ queryKey: ['my-videos'] })
  }

  const gutter = 10
  const cellW = (width - pagePadding * 2 - gutter) / 2
  const total = deliverables.length
  const selected = openId ? deliverables.find((d) => d.id === openId) ?? null : null
  const selectedIndex = selected ? deliverables.findIndex((d) => d.id === selected.id) : -1

  // Keep each deliverable's global position (for "Video N of M") while bucketing by stage.
  const indexed = useMemo(
    () => deliverables.map((d, i) => ({ d, i, stage: resolveStage(d, requiresReview) })),
    [deliverables, requiresReview],
  )
  const sections = useMemo(
    () =>
      SECTION_ORDER.map((s) => ({ ...s, items: indexed.filter((x) => x.stage === s.stage) })).filter(
        (s) => s.items.length > 0,
      ),
    [indexed],
  )

  return (
    <View style={{ gap: 20 }}>
      <FlowLegend requiresReview={requiresReview} />

      {sections.map((sec) => {
        const ui = STAGE_UI[sec.stage]
        // "Ready to upload" spans the full width — one prominent banner per row —
        // while every other bucket keeps the two-column portrait grid.
        const fullWidth = sec.stage === 'upload'
        const tileW = fullWidth ? width - pagePadding * 2 : cellW
        return (
          <View key={sec.stage} style={{ gap: 11 }}>
            {/* Section header — which bucket + how many */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={ui.icon} size={15} color={ui.color} />
              </View>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>{sec.heading}</Text>
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '800', color: ui.color }}>{sec.items.length}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gutter }}>
              {sec.items.map(({ d, i }) => (
                <VideoTile
                  key={d.id}
                  deliverable={d}
                  index={i}
                  total={total}
                  video={videoByDeliverable.get(d.id)}
                  width={tileW}
                  fullWidth={fullWidth}
                  hasFeedback={(unreadFeedback?.[d.id] ?? 0) > 0}
                  requiresReview={requiresReview}
                  onPress={() => setOpenId(d.id)}
                />
              ))}
            </View>
          </View>
        )
      })}

      {/* Action sheet — RN Modal that slides up from the bottom; tap the dim backdrop to leave */}
      <Modal visible={!!openId} transparent animationType="slide" statusBarTranslucent onRequestClose={closeSheet}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel="Close" />
          <View style={{ maxHeight: '92%', backgroundColor: redesign.color.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, ...redesign.shadow.card }}>
            <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: redesign.color.hairlineStrong, marginBottom: 4 }} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 14 }}
            >
              {selected ? (() => {
            const stage = resolveStage(selected, requiresReview)
            const ui = STAGE_UI[stage]
            return (
              <>
                  {/* header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <LinearGradient colors={ui.ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 15, padding: 2.5, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 12.5, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: typography.fontFamily, fontWeight: '900', fontSize: 18, color: ui.color, letterSpacing: -0.5 }}>{selectedIndex + 1}</Text>
                      </View>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.fontFamily, fontWeight: '800', fontSize: 17, color: redesign.color.ink, letterSpacing: -0.3 }}>
                        {`Video ${selectedIndex + 1} `}
                        <Text style={{ color: redesign.color.faint, fontWeight: '700', fontSize: 14 }}>{`of ${total}`}</Text>
                      </Text>
                      <Text style={{ fontFamily: typography.fontFamily, fontWeight: '600', fontSize: 12, color: redesign.color.muted }}>
                        {platformLabel(selected.platform)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingLeft: 9, paddingRight: 12, paddingVertical: 6, backgroundColor: ui.bg }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ui.color }} />
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '800', color: ui.color }}>{ui.label}</Text>
                    </View>
                  </View>

                  {/* instruction — skipped where a richer hero already says it (in-review, approved, live) */}
                  {stage !== 'under_review' && stage !== 'submit_link' && stage !== 'live' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 13 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name={ui.icon} size={16} color={ui.color} />
                      </View>
                      <Text style={{ flex: 1, color: redesign.color.ink, fontSize: 13.5, lineHeight: 19.5, fontWeight: '600', fontFamily: typography.fontFamily }}>{ui.instruction}</Text>
                    </View>
                  ) : null}

                  {/* brand feedback */}
                  <FeedbackButton
                    deliverableId={selected.id}
                    brandName={brandName}
                    brandLogoUrl={brandLogoUrl}
                    fallbackReason={stage === 'revision' ? selected.flagReason : null}
                  />

                  {/* the one action for this stage */}
                  {stage === 'deliver' ? (
                    <CombinedDeliveryRow deliverableId={selected.id} brandName={brandName} onDone={closeSheet} />
                  ) : stage === 'revision' ? (
                    <VideoUploadRow deliverableId={selected.id} submitLabel="Re-upload video" brandName={brandName} onDone={closeSheet} />
                  ) : stage === 'upload' ? (
                    <VideoUploadRow deliverableId={selected.id} submitLabel="Upload video for review" brandName={brandName} onDone={closeSheet} />
                  ) : stage === 'under_review' ? (
                    <VideoReviewActions deliverableId={selected.id} brandName={brandName} />
                  ) : stage === 'submit_link' ? (
                    <>
                      <ApprovedHero brandName={brandName} />
                      {/* TikTok-API flow (flagged off in prod): push to drafts in one tap,
                          or pick the already-published video. Manual paste is the
                          always-available fallback. */}
                      {tiktokApiFeaturesEnabled ? (
                        <>
                          <PostStep label="Fastest — one tap">
                            <SendToTikTokButton deliverableId={selected.id} />
                          </PostStep>
                          <PostStep label="Already posted it?">
                            <TikTokVideoPicker deliverableId={selected.id} onLinked={closeSheet} />
                          </PostStep>
                          <PostStep label="Or paste the link">
                            <LinkSubmitRow deliverableId={selected.id} submitLabel="Submit TikTok link" />
                          </PostStep>
                        </>
                      ) : (
                        <PostStep label="Paste your TikTok link">
                          <LinkSubmitRow deliverableId={selected.id} submitLabel="Submit TikTok link" />
                        </PostStep>
                      )}
                      <ViewVideoButton deliverableId={selected.id} />
                    </>
                  ) : (
                    <>
                      <LiveHero brandName={brandName} />
                      {tiktokApiFeaturesEnabled && selected.url && /^https?:\/\//i.test(selected.url) ? (
                        // Flagged on: embedded live video (oEmbed) + tracked metrics.
                        <DeliverablePerformance deliverableId={selected.id} url={selected.url} />
                      ) : selected.url && /^https?:\/\//i.test(selected.url) ? (
                        <Pressable
                          onPress={() => Linking.openURL(selected.url || '').catch(() => undefined)}
                          style={{ borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, backgroundColor: redesign.color.card, paddingHorizontal: 14, paddingVertical: 12, gap: 5 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialCommunityIcons name="check-circle" size={15} color="#0F9F6E" />
                            <Text style={{ color: '#0F9F6E', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>LIVE ON TIKTOK</Text>
                          </View>
                          <Text numberOfLines={2} style={{ color: redesign.color.purple, fontSize: 14, fontFamily: typography.fontFamily }}>{selected.url}</Text>
                        </Pressable>
                      ) : null}
                      <ViewVideoButton deliverableId={selected.id} />
                    </>
                  )}
              </>
            )
              })() : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {!myVideos ? <ActivityIndicator color={redesign.color.purple} style={{ marginTop: 14 }} /> : null}
    </View>
  )
}
