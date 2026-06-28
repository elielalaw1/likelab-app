import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'

type FloatingTabBarVisibilityContextValue = {
  visible: boolean
  setVisible: (value: boolean) => void
  reportScroll: (y: number) => void
  resetScrollTracking: () => void
  // Live scroll offset of the active screen — drives the header's scroll elevation.
  scrollY: SharedValue<number>
}

const noop = () => undefined

const FloatingTabBarVisibilityContext = createContext<FloatingTabBarVisibilityContextValue>({
  visible: true,
  setVisible: noop,
  reportScroll: noop,
  resetScrollTracking: noop,
  scrollY: { value: 0 } as SharedValue<number>,
})

type Props = {
  children: ReactNode
}

export function FloatingTabBarVisibilityProvider({ children }: Props) {
  const [visibleState, setVisibleState] = useState(true)
  const scrollY = useSharedValue(0)
  const visibleRef = useRef(true)
  const lastYRef = useRef(0)
  const accumulatedDeltaRef = useRef(0)
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
  }, [])

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
    [setVisible, scrollY]
  )

  const value = useMemo(
    () => ({
      visible: visibleState,
      setVisible,
      reportScroll,
      resetScrollTracking,
      scrollY,
    }),
    [visibleState, setVisible, reportScroll, resetScrollTracking, scrollY]
  )

  return <FloatingTabBarVisibilityContext.Provider value={value}>{children}</FloatingTabBarVisibilityContext.Provider>
}

export function useFloatingTabBarVisibility() {
  return useContext(FloatingTabBarVisibilityContext)
}

