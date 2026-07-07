import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { onStartProfileTour } from '@/features/onboarding/profileTourControl'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

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
  // True while scrolling/measuring the next element — the tooltip hides until
  // the spotlight lands.
  const [measuring, setMeasuring] = useState(true)
  const pulse = useSharedValue(0)
  useEffect(() => {
    if (!active) return
    pulse.value = 0
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false)
  }, [active, pulse])
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
    setMeasuring(true)
    setActive(true)
  }, [])

  useEffect(() => onStartProfileTour(begin), [begin])

  // Bring the target into view, polling until the position is stable — the
  // spotlight appears the moment two consecutive measurements agree, instead of
  // waiting a fixed (worst-case) beat. NOTE: the spotlight itself is STATIC per
  // step — animating that huge dim-border view's layout props is what made this
  // lag. Only transforms/opacity animate here.
  useEffect(() => {
    if (!active) return
    const steps = stepsRef.current
    const scrollRef = scrollRefRef.current
    const contentY = contentYRef.current
    const step = steps[idx]
    if (!step) return
    setMeasuring(true)

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const desired = vhRef.current * 0.32
    let offset = Math.max(0, (contentY.current?.[step.key] ?? 0) - desired)
    let corrections = 0
    let lastPos: Rect | null = null
    let waits = 0

    scrollRef.current?.scrollTo({ y: offset, animated: true })

    const poll = () => {
      if (cancelled) return
      const node = step.viewRef.current
      const root = rootRef.current
      if (!node || !root) {
        if (waits++ < 40) timer = setTimeout(poll, 120)
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
            if (waits++ < 40) timer = setTimeout(poll, 120)
            return
          }
          const cur: Rect = { x: x - ox, y: y - oy, width: w, height: h }
          const settled = !!lastPos && Math.abs(lastPos.y - cur.y) < 1.5 && Math.abs(lastPos.x - cur.x) < 1.5
          lastPos = cur
          if (!settled) {
            timer = setTimeout(poll, 90)
            return
          }
          const tooHigh = cur.y < 56
          const tooLow = cur.y + Math.min(h, 140) > viewportH - 56
          if ((tooHigh || tooLow) && corrections < 2) {
            corrections++
            offset = Math.max(0, offset + (cur.y - desired))
            scrollRef.current?.scrollTo({ y: offset, animated: true })
            lastPos = null
            timer = setTimeout(poll, 160)
            return
          }
          haptic.light()
          setRect(cur)
          setMeasuring(false)
        })
      })
    }
    timer = setTimeout(poll, 90)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // spotX/Y/W/H are stable shared-value refs — safe to omit.
     
  }, [active, idx])

  const step = steps[idx]
  const isLast = idx >= steps.length - 1

  const next = () => {
    haptic.selection()
    if (isLast) {
      setActive(false)
      setRect(null)
    } else {
      setRect(null)
      setMeasuring(true)
      setIdx((i) => i + 1)
    }
  }
  const skip = () => {
    setActive(false)
    setRect(null)
  }

  // Spotlight frame (static values for tooltip placement — the visual hole itself
  // is driven by the animated shared values so it can glide between elements).
  const sx = rect ? Math.max(0, rect.x - SPOT_PAD) : 0
  const sy = rect ? Math.max(0, rect.y - SPOT_PAD) : 0
  const sw = rect ? rect.width + SPOT_PAD * 2 : 0
  const sh = rect ? rect.height + SPOT_PAD * 2 : 0

  const B = Math.max(W, H)
  // Soft breathing halo — transform + opacity ONLY (layout props on the huge dim
  // view are what caused the previous lag).
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.045 }],
    opacity: (1 - pulse.value) * 0.55,
  }))

  // Place the tooltip on whichever side of the element has more room, so it never
  // covers the thing it describes. Arrow points back at the element.
  const below = rect ? vh - (sy + sh) >= sy : true

  if (!active || !step) return null

  return (
    <View ref={rootRef} style={StyleSheet.absoluteFill}>
      {rect ? (
        <>
          {/* Dim everything except a rounded cutout — STATIC per step (animating
              this huge bordered view's layout was the lag). The group fades in. */}
          <Animated.View key={`spot-${step.key}`} entering={FadeIn.duration(160)} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: sx - B, top: sy - B, width: sw + B * 2, height: sh + B * 2, borderWidth: B, borderColor: DIM, borderRadius: B + SPOT_RADIUS }}
            />
            {/* Breathing halo (transform+opacity only) + crisp ring */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, borderRadius: SPOT_RADIUS, borderWidth: 2, borderColor: redesign.color.purple }, haloStyle]} />
            <View pointerEvents="none" style={{ position: 'absolute', left: sx, top: sy, width: sw, height: sh, borderRadius: SPOT_RADIUS, borderWidth: 2, borderColor: redesign.color.purple }} />
          </Animated.View>

          {/* Tap-blocker over the dimmed area — taps do nothing; use the buttons */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />

          {!measuring ? (
            <>
              <Animated.View
                key={step.key}
                entering={FadeInDown.duration(240)}
                style={[
                  { position: 'absolute', left: 18, right: 18, backgroundColor: redesign.color.card, borderRadius: 20, paddingTop: 10, paddingBottom: 14, paddingHorizontal: 16, gap: 5, borderWidth: 1, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.cta },
                  below ? { top: sy + sh + 40 } : { bottom: vh - sy + 40 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {steps.map((_, i) => (
                      <View key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 999, backgroundColor: i === idx ? redesign.color.purple : redesign.color.hairlineStrong }} />
                    ))}
                  </View>
                  {!isLast ? (
                    <Pressable onPress={skip} hitSlop={8}>
                      <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: redesign.color.muted }}>Skip</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>{step.title}</Text>
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted, lineHeight: 18 }}>{step.body}</Text>
                <View style={{ marginTop: 6 }}>
                  <LiquidButton label={isLast ? 'Done' : 'Next'} onPress={next} minHeight={44} hapticFeedback={false} />
                </View>
              </Animated.View>
            </>
          ) : null}
        </>
      ) : (
        // Measuring the first element — dim the screen so the start isn't jarring,
        // and swallow taps until the spotlight lands. Always keep a Skip escape so a
        // measurement that never resolves can't soft-lock the user on a dim,
        // tap-swallowing screen.
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} onPress={() => {}}>
            <Pressable
              onPress={skip}
              hitSlop={10}
              style={{ position: 'absolute', top: 60, right: 18, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800', color: '#fff' }}>Skip</Text>
            </Pressable>
          </Pressable>
        </Animated.View>
      )}
    </View>
  )
}
