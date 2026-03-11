import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type FloatingTabBarVisibilityContextValue = {
  visible: boolean
  setVisible: (value: boolean) => void
  reportScroll: (y: number) => void
  resetScrollTracking: () => void
}

const noop = () => undefined

const FloatingTabBarVisibilityContext = createContext<FloatingTabBarVisibilityContextValue>({
  visible: true,
  setVisible: noop,
  reportScroll: noop,
  resetScrollTracking: noop,
})

type Props = {
  children: ReactNode
}

export function FloatingTabBarVisibilityProvider({ children }: Props) {
  const [visibleState, setVisibleState] = useState(true)
  const visibleRef = useRef(true)
  const lastYRef = useRef(0)
  const accumulatedDeltaRef = useRef(0)

  const setVisible = useCallback((value: boolean) => {
    if (visibleRef.current === value) return
    visibleRef.current = value
    setVisibleState(value)
  }, [])

  const resetScrollTracking = useCallback(() => {
    lastYRef.current = 0
    accumulatedDeltaRef.current = 0
  }, [])

  const reportScroll = useCallback(
    (rawY: number) => {
      const y = Math.max(0, rawY || 0)
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
    [setVisible]
  )

  const value = useMemo(
    () => ({
      visible: visibleState,
      setVisible,
      reportScroll,
      resetScrollTracking,
    }),
    [visibleState, setVisible, reportScroll, resetScrollTracking]
  )

  return <FloatingTabBarVisibilityContext.Provider value={value}>{children}</FloatingTabBarVisibilityContext.Provider>
}

export function useFloatingTabBarVisibility() {
  return useContext(FloatingTabBarVisibilityContext)
}

