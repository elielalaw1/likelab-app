import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Easing, runOnJS, useAnimatedScrollHandler, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'

// Scroll distance over which the header continuously collapses (0 = shown … 1 = hidden).
const HEADER_COLLAPSE_PX = 90

type FloatingTabBarVisibilityContextValue = {
  visible: boolean
  setVisible: (value: boolean) => void
  reportScroll: (y: number) => void
  resetScrollTracking: () => void
  // Live scroll offset of the active screen — drives the header's scroll elevation.
  scrollY: SharedValue<number>
  // Continuous header collapse progress, 0 (shown) … 1 (hidden) — tracks the scroll
  // gesture so the header slides smoothly instead of snapping on a threshold.
  headerOffset: SharedValue<number>
  // UI-thread scroll bookkeeping — driven by the worklet handler so the header
  // updates every frame independently of the JS thread.
  lastY: SharedValue<number>
  accumDelta: SharedValue<number>
  primed: SharedValue<number>
}

const noop = () => undefined

const FloatingTabBarVisibilityContext = createContext<FloatingTabBarVisibilityContextValue>({
  visible: true,
  setVisible: noop,
  reportScroll: noop,
  resetScrollTracking: noop,
  scrollY: { value: 0 } as SharedValue<number>,
  headerOffset: { value: 0 } as SharedValue<number>,
  lastY: { value: 0 } as SharedValue<number>,
  accumDelta: { value: 0 } as SharedValue<number>,
  primed: { value: 0 } as SharedValue<number>,
})

type Props = {
  children: ReactNode
}

export function FloatingTabBarVisibilityProvider({ children }: Props) {
  const [visibleState, setVisibleState] = useState(true)
  const scrollY = useSharedValue(0)
  const headerOffset = useSharedValue(0)
  // UI-thread bookkeeping for the worklet scroll handler (see useTabScrollHandler).
  const lastY = useSharedValue(0)
  const accumDelta = useSharedValue(0)
  const primed = useSharedValue(0)
  const visibleRef = useRef(true)
  const lastYRef = useRef(0)
  const accumulatedDeltaRef = useRef(0)
  // Target for the header collapse, kept on the JS thread. Each scroll sample eases
  // the shared value toward this target, so the header glides between the (discrete,
  // JS-thread) scroll events instead of teleporting on fast flicks.
  const targetOffsetRef = useRef(0)
  // After a reset the next scroll event seeds lastYRef with the live offset instead
  // of diffing against a stale 0. The tab navigator (lazy:false) preserves scroll
  // position, so returning to a tab scrolled to y=500 would otherwise produce a
  // first delta of +500 and spuriously hide (and invert) the bar.
  const primeNextRef = useRef(false)

  const setVisible = useCallback((value: boolean) => {
    if (visibleRef.current === value) return
    visibleRef.current = value
    setVisibleState(value)
  }, [])

  const resetScrollTracking = useCallback(() => {
    lastYRef.current = 0
    accumulatedDeltaRef.current = 0
    primeNextRef.current = true
    // Seed the UI-thread handler too: next worklet event records the (preserved)
    // offset instead of diffing against a stale value.
    accumDelta.value = 0
    primed.value = 1
  }, [accumDelta, primed])

  const reportScroll = useCallback(
    (rawY: number) => {
      const y = Math.max(0, rawY || 0)
      scrollY.value = y

      // First report after a reset: just record the position (no delta) so a
      // preserved scroll offset doesn't read as a huge sudden movement.
      if (primeNextRef.current) {
        primeNextRef.current = false
        lastYRef.current = y
        return
      }

      const delta = y - lastYRef.current
      lastYRef.current = y

      // Ignore micro-movements to prevent jitter/flicker.
      if (Math.abs(delta) < 2) return

      // Continuously collapse the header with the scroll gesture, easing toward the
      // target each sample so fast flicks glide instead of stepping.
      if (y <= 4) {
        targetOffsetRef.current = 0
        headerOffset.value = withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) })
      } else {
        const next = targetOffsetRef.current + delta / HEADER_COLLAPSE_PX
        const clamped = next < 0 ? 0 : next > 1 ? 1 : next
        targetOffsetRef.current = clamped
        headerOffset.value = withTiming(clamped, { duration: 150, easing: Easing.out(Easing.quad) })
      }

      // Always show near top.
      if (y <= 12) {
        accumulatedDeltaRef.current = 0
        setVisible(true)
        return
      }

      accumulatedDeltaRef.current += delta

      // Hide only after meaningful downward movement.
      if (accumulatedDeltaRef.current > 18 && y > 48) {
        setVisible(false)
        accumulatedDeltaRef.current = 0
        return
      }

      // Show after meaningful upward movement.
      if (accumulatedDeltaRef.current < -14) {
        setVisible(true)
        accumulatedDeltaRef.current = 0
      }
    },
    [setVisible, scrollY, headerOffset]
  )

  const value = useMemo(
    () => ({
      visible: visibleState,
      setVisible,
      reportScroll,
      resetScrollTracking,
      scrollY,
      headerOffset,
      lastY,
      accumDelta,
      primed,
    }),
    [visibleState, setVisible, reportScroll, resetScrollTracking, scrollY, headerOffset, lastY, accumDelta, primed]
  )

  return <FloatingTabBarVisibilityContext.Provider value={value}>{children}</FloatingTabBarVisibilityContext.Provider>
}

export function useFloatingTabBarVisibility() {
  return useContext(FloatingTabBarVisibilityContext)
}

// Buttery header motion: an on-UI-thread scroll handler. Because it runs in a
// worklet, scrollY + headerOffset update every frame regardless of what the JS
// thread is doing, so the header never stutters. Visibility toggles (which flip
// React state for the bottom bar) hop back to JS only at the threshold crossings.
export function useTabScrollHandler() {
  const { scrollY, headerOffset, lastY, accumDelta, primed, setVisible } = useContext(FloatingTabBarVisibilityContext)
  return useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet'
      const y = Math.max(0, event.contentOffset.y)
      scrollY.value = y

      // First frame after a reset: record the (preserved) offset, emit no delta.
      if (primed.value === 1) {
        primed.value = 0
        lastY.value = y
        return
      }

      // Keep lastY until we actually consume the delta, so slow drifts (< a frame's
      // worth of pixels) accumulate instead of being dropped — otherwise slow scrolls
      // read as laggy because sub-pixel deltas never move the header.
      const delta = y - lastY.value
      if (delta > -0.3 && delta < 0.3) return
      lastY.value = y

      // Per-frame collapse on the UI thread — smooth by construction, no easing
      // needed while actively scrolling. Ease only the settle back to the top.
      if (y <= 4) {
        headerOffset.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) })
      } else {
        const next = headerOffset.value + delta / HEADER_COLLAPSE_PX
        headerOffset.value = next < 0 ? 0 : next > 1 ? 1 : next
      }

      // Bottom-bar visibility — same thresholds as before, hopping to JS to set state.
      if (y <= 12) {
        accumDelta.value = 0
        runOnJS(setVisible)(true)
        return
      }
      accumDelta.value += delta
      if (accumDelta.value > 18 && y > 48) {
        accumDelta.value = 0
        runOnJS(setVisible)(false)
        return
      }
      if (accumDelta.value < -14) {
        accumDelta.value = 0
        runOnJS(setVisible)(true)
      }
    },
  })
}

