import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import type { Deliverable } from '@/features/core/types'
import { getMyVideos, MyVideo } from '@/features/deliverables/api'
import { deliverableStage, STAGE_UI, type DeliverableStage } from '@/features/deliverables/stage'
import { VideoUploadRow } from '@/features/shared/ui/VideoUploadRow'
import { LinkSubmitRow } from '@/features/shared/ui/LinkSubmitRow'
import { VideoReviewActions, ViewVideoButton } from '@/features/deliverables/ui/VideoReviewActions'
import { FeedbackButton } from '@/features/deliverables/ui/FeedbackChat'

// Session-lived cache of on-device thumbnails, keyed by deliverable id.
const thumbCache = new Map<string, string>()

function platformLabel(p?: string | null) {
  if (!p) return 'TikTok'
  return p.replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

// One TikTok-style portrait tile — the uploaded video's poster (or a stage-tinted
// placeholder) with the video number + a status pill overlaid.
function VideoTile({
  deliverable,
  index,
  total,
  video,
  width,
  onPress,
}: {
  deliverable: Deliverable
  index: number
  total: number
  video?: MyVideo
  width: number
  onPress: () => void
}) {
  const stage = deliverableStage(deliverable)
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

  const height = width * 1.4
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

      {/* tiktok badge when live */}
      {video?.tiktokUrl ? (
        <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome5 name="tiktok" size={11} color="#fff" />
        </View>
      ) : null}

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
const FLOW: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }[] = [
  { icon: 'tray-arrow-up', label: 'Upload' },
  { icon: 'eye-check-outline', label: 'Review' },
  { icon: 'check-decagram', label: 'Approved' },
  { icon: 'link-variant', label: 'Post link' },
  { icon: 'star-circle-outline', label: 'Live' },
]

function FlowLegend() {
  return (
    <View style={{ backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingVertical: 13, paddingHorizontal: 12, ...redesign.shadow.card }}>
      <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.2, textTransform: 'uppercase' }}>How it works</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10 }}>
        {FLOW.map((s, i) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            <View style={{ alignItems: 'center', gap: 5, width: 52 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: redesign.color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={s.icon} size={15} color={redesign.color.purple} />
              </View>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center' }}>{s.label}</Text>
            </View>
            {i < FLOW.length - 1 ? <MaterialCommunityIcons name="chevron-right" size={15} color={redesign.color.faint} style={{ marginTop: 8 }} /> : null}
          </View>
        ))}
      </View>
    </View>
  )
}

// Grid sections, ordered action-first so the videos that need the creator sit on
// top, then what's waiting on the brand, then what's done. Each maps to a stage;
// empty sections are skipped. Heading copy is clearer than the tiny pill labels.
const SECTION_ORDER: { stage: DeliverableStage; heading: string }[] = [
  { stage: 'revision', heading: 'Changes requested' },
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
  pagePadding = 16,
}: {
  deliverables: Deliverable[]
  brandName?: string | null
  brandLogoUrl?: string | null
  pagePadding?: number
}) {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { data: myVideos } = useQuery({ queryKey: ['my-videos'], queryFn: getMyVideos, placeholderData: (prev) => prev })
  const [openId, setOpenId] = useState<string | null>(null)

  const videoByDeliverable = useMemo(() => {
    const map = new Map<string, MyVideo>()
    for (const v of myVideos || []) if (!map.has(v.deliverableId)) map.set(v.deliverableId, v)
    return map
  }, [myVideos])

  // Lift the sheet exactly in sync with the keyboard — driven off the keyboard
  // events (with their own duration) instead of KeyboardAvoidingView, which janks
  // because its padding animation doesn't follow the keyboard curve.
  const kb = useSharedValue(0)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height ?? 0
      const duration = (e as { duration?: number }).duration || 250
      kb.value = withTiming(Math.max(0, h - insets.bottom), { duration, easing: Easing.out(Easing.quad) })
    })
    const hide = Keyboard.addListener(hideEvt, (e) => {
      const duration = (e as { duration?: number }).duration || 200
      kb.value = withTiming(0, { duration, easing: Easing.out(Easing.quad) })
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [kb, insets.bottom])
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -kb.value }] }))

  const gutter = 10
  const cellW = (width - pagePadding * 2 - gutter) / 2
  const total = deliverables.length
  const selected = openId ? deliverables.find((d) => d.id === openId) ?? null : null
  const selectedIndex = selected ? deliverables.findIndex((d) => d.id === selected.id) : -1

  // Keep each deliverable's global position (for "Video N of M") while bucketing by stage.
  const indexed = useMemo(
    () => deliverables.map((d, i) => ({ d, i, stage: deliverableStage(d) })),
    [deliverables],
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
      <FlowLegend />

      {sections.map((sec) => {
        const ui = STAGE_UI[sec.stage]
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
                  width={cellW}
                  onPress={() => setOpenId(d.id)}
                />
              ))}
            </View>
          </View>
        )
      })}

      {/* Action sheet */}
      <Modal visible={selected != null} transparent animationType="slide" onRequestClose={() => setOpenId(null)} statusBarTranslucent>
        <View style={{ flex: 1 }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenId(null)}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          </Pressable>
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: redesign.color.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 20, maxHeight: '88%' }, sheetStyle]}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: redesign.color.hairlineStrong, marginBottom: 14 }} />
          {selected ? (() => {
            const stage = deliverableStage(selected)
            const ui = STAGE_UI[stage]
            return (
              <Animated.View entering={FadeIn.duration(180)}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
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

                  {/* instruction */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 13 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: ui.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name={ui.icon} size={16} color={ui.color} />
                    </View>
                    <Text style={{ flex: 1, color: redesign.color.ink, fontSize: 13.5, lineHeight: 19.5, fontWeight: '600', fontFamily: typography.fontFamily }}>{ui.instruction}</Text>
                  </View>

                  {/* brand feedback */}
                  <FeedbackButton
                    deliverableId={selected.id}
                    brandName={brandName}
                    brandLogoUrl={brandLogoUrl}
                    fallbackReason={stage === 'revision' ? selected.flagReason : null}
                  />

                  {/* the one action for this stage */}
                  {stage === 'revision' ? (
                    <VideoUploadRow deliverableId={selected.id} submitLabel="Re-upload video" onDone={() => setOpenId(null)} />
                  ) : stage === 'upload' ? (
                    <VideoUploadRow deliverableId={selected.id} submitLabel="Upload video for review" onDone={() => setOpenId(null)} />
                  ) : stage === 'under_review' ? (
                    <VideoReviewActions deliverableId={selected.id} />
                  ) : stage === 'submit_link' ? (
                    <>
                      <LinkSubmitRow deliverableId={selected.id} submitLabel="Submit TikTok link" />
                      <ViewVideoButton deliverableId={selected.id} />
                    </>
                  ) : (
                    <>
                      {selected.url && /^https?:\/\//i.test(selected.url) ? (
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
                </ScrollView>
              </Animated.View>
            )
          })() : null}
          </Animated.View>
        </View>
      </Modal>

      {!myVideos ? <ActivityIndicator color={redesign.color.purple} style={{ marginTop: 14 }} /> : null}
    </View>
  )
}
