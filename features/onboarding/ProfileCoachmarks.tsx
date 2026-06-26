import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { onStartProfileTour } from '@/features/onboarding/profileTourControl'

type Rect = { x: number; y: number; width: number; height: number }

export type CoachStep = {
  key: string
  title: string
  body: string
  viewRef: React.RefObject<View | null>
}

const SPOT_PAD = 7 // padding around the highlighted element for the spotlight frame
const SPOT_RADIUS = 20 // rounded corners on the cutout, to match the profile cards
const DIM = 'rgba(14,14,26,0.55)'

// Bobbing arrow that points at the highlighted element.
function BobArrow({ left, top, down }: { left: number; top: number; down: boolean }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [t])
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: (down ? 1 : -1) * t.value * 7 }] }))
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left, top }, style]}>
      <MaterialCommunityIcons name={down ? 'arrow-down-bold' : 'arrow-up-bold'} size={34} color={redesign.color.purple} />
    </Animated.View>
  )
}

// Guided tour over the REAL profile elements — dims the screen, cuts a spotlight
// around each element in turn, and points an arrow + tooltip at it. Rendered as a
// fixed overlay (Screen's `overlay` prop), not a Modal, so it presents reliably.
// Coordinates are measured relative to the overlay's own origin (no inset
// guessing). Driven by the startProfileTour() signal.
export function ProfileCoachmarks({ steps, scrollRef, contentY }: {
  steps: CoachStep[]
  scrollRef: React.RefObject<ScrollView | null>
  contentY: React.RefObject<Record<string, number>>
}) {
  const { width: W, height: H } = useWindowDimensions()
  const rootRef = useRef<View>(null)
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  // The overlay fills the screen via absoluteFill, but how SafeAreaView lays out
  // (padding vs. shrink) decides its real height. Measure it instead of guessing
  // from insets — that mismatch was placing the tooltip on top of its element.
  const vhRef = useRef(H)
  const [vh, setVh] = useState(H)

  // Read these through refs inside the placement effect so the effect's identity
  // depends only on the tour position (active/idx). The `steps` array (and the
  // scrollRef/contentY props) are recreated on every profile re-render — keeping
  // them in the dep array re-ran the effect on unrelated renders, which re-scrolled
  // and re-measured the spotlight, making the active tour flicker/jitter.
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const scrollRefRef = useRef(scrollRef)
  scrollRefRef.current = scrollRef
  const contentYRef = useRef(contentY)
  contentYRef.current = contentY

  const begin = useCallback(() => {
    setIdx(0)
    setRect(null)
    setActive(true)
  }, [])

  useEffect(() => onStartProfileTour(begin), [begin])

  // Bring the target into view, then point at it. One smooth scroll toward
  // "element ~32% down the viewport", wait for it to settle, then measure once and
  // place the spotlight. Only correct (at most twice) if the element landed clearly
  // off-screen — re-measuring on a tight loop is what made the scroll jitter and
  // re-adjust forever. Bottom elements (e.g. Contact Us) can't scroll that high →
  // they settle low and the tooltip flips above them with a downward arrow.
  useEffect(() => {
    if (!active) return
    const steps = stepsRef.current
    const scrollRef = scrollRefRef.current
    const contentY = contentYRef.current
    const step = steps[idx]
    if (!step) return
    setRect(null)

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const desired = vhRef.current * 0.32
    let offset = Math.max(0, (contentY.current?.[step.key] ?? 0) - desired)
    let corrections = 0
    let waits = 0

    scrollRef.current?.scrollTo({ y: offset, animated: true })

    const place = () => {
      if (cancelled) return
      const node = step.viewRef.current
      const root = rootRef.current
      if (!node || !root) {
        if (waits++ < 30) timer = setTimeout(place, 150)
        return
      }
      root.measureInWindow((ox, oy, _ow, oh) => {
        if (oh > 0 && oh !== vhRef.current) {
          vhRef.current = oh
          setVh(oh)
        }
        const viewportH = vhRef.current
        node.measureInWindow((x, y, w, h) => {
          if (cancelled) return
          if (w === 0) {
            if (waits++ < 30) timer = setTimeout(place, 150)
            return
          }
          const localY = y - oy
          const tooHigh = localY < 56
          const tooLow = localY + Math.min(h, 140) > viewportH - 56
          // Only re-scroll if it's actually clipped, and only a couple of times.
          if ((tooHigh || tooLow) && corrections < 2) {
            corrections++
            offset = Math.max(0, offset + (localY - desired))
            scrollRef.current?.scrollTo({ y: offset, animated: true })
            timer = setTimeout(place, 380)
            return
          }
          setRect({ x: x - ox, y: localY, width: w, height: h })
        })
      })
    }
    // Wait for the initial scroll animation to finish before the first measure.
    timer = setTimeout(place, 380)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active, idx])

  if (!active) return null

  const step = steps[idx]
  const isLast = idx >= steps.length - 1

  const next = () => {
    haptic.selection()
    if (isLast) {
      setActive(false)
      setRect(null)
    } else {
      setRect(null)
      setIdx((i) => i + 1)
    }
  }
  const skip = () => {
    setActive(false)
    setRect(null)
  }

  // Spotlight frame around the element.
  const sx = rect ? Math.max(0, rect.x - SPOT_PAD) : 0
  const sy = rect ? Math.max(0, rect.y - SPOT_PAD) : 0
  const sw = rect ? rect.width + SPOT_PAD * 2 : 0
  const sh = rect ? rect.height + SPOT_PAD * 2 : 0

  // Place the tooltip on whichever side of the element has more room, so it never
  // covers the thing it describes. Arrow points back at the element.
  const below = rect ? vh - (sy + sh) >= sy : true
  const arrowLeft = rect ? Math.min(Math.max(rect.x + rect.width / 2 - 17, 18), W - 52) : 0

  return (
    <View ref={rootRef} style={StyleSheet.absoluteFill}>
      {rect ? (
        <>
          {/* Dim everything except a ROUNDED cutout around the element. A single
              view whose huge border IS the dim: its inner edge (border radius −
              border width) rounds the hole, so corners match the cards instead of
              looking square. */}
          {(() => {
            const B = Math.max(W, H) // border wide enough to reach every screen edge
            return (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: sx - B,
                  top: sy - B,
                  width: sw + B * 2,
                  height: sh + B * 2,
                  borderWidth: B,
                  borderColor: DIM,
                  borderRadius: B + SPOT_RADIUS,
                }}
              />
            )
          })()}
          {/* Highlight border around the cutout */}
          <View pointerEvents="none" style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, borderRadius: SPOT_RADIUS, borderWidth: 2, borderColor: redesign.color.purple }} />

          {/* Tap-blocker over the dimmed area — taps do nothing; use the buttons */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

          <BobArrow left={arrowLeft} top={below ? sy + sh + 4 : sy - 38} down={!below} />

          <View
            style={[
              { position: 'absolute', left: 18, right: 18, backgroundColor: redesign.color.card, borderRadius: 18, paddingTop: 8, paddingBottom: 12, paddingHorizontal: 16, gap: 4, borderWidth: 1, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.cta },
              below ? { top: sy + sh + 40 } : { bottom: vh - sy + 40 },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1, fontVariant: ['tabular-nums'] }}>
                {idx + 1} / {steps.length}
              </Text>
              {!isLast ? (
                <Pressable onPress={skip} hitSlop={8}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: redesign.color.muted }}>Skip</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>{step.title}</Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted, lineHeight: 18 }}>{step.body}</Text>
            <Pressable
              onPress={next}
              style={{ marginTop: 4, minHeight: 40, borderRadius: 999, backgroundColor: redesign.color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>{isLast ? 'Done' : 'Next'}</Text>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#fff" />
            </Pressable>
          </View>
        </>
      ) : (
        // Measuring the next element — dim the screen so the jump isn't jarring,
        // and swallow taps until the spotlight lands.
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} onPress={() => {}} />
      )}
    </View>
  )
}
