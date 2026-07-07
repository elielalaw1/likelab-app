import { ReactNode, RefObject, useState, useCallback, useEffect, useRef } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { type SharedValue, useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { spacing } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { useTheme } from '@/features/core/useTheme'
import { WallpaperBackground } from '@/features/shared/ui/WallpaperBackground'
import { RefreshHeader } from '@/features/shared/ui/RefreshHeader'
import { useFloatingTabBarVisibility, useTabScrollHandler } from '@/features/navigation/FloatingTabBarVisibility'
import { getFloatingTabBarSpace, TAB_HEADER_HEIGHT } from '@/features/navigation/floatingTabBar.constants'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'

type GradientSpec = {
  colors: readonly [string, string, ...string[]]
  start?: { x: number; y: number }
  end?: { x: number; y: number }
}

type Props = {
  children: ReactNode
  scroll?: boolean
  tabAware?: boolean
  overlay?: ReactNode
  overlayPadding?: number
  scrollRef?: RefObject<ScrollView | null>
  onRefresh?: () => Promise<void>
  gradient?: GradientSpec
  wallpaper?: boolean
  bgColor?: string
  contentGap?: number
  // When true the screen sits UNDER the persistent blur header overlay: it skips its
  // own top safe-area inset and pads its content down by the header's height so the
  // content scrolls beneath the blur instead of starting under it.
  headerOverlay?: boolean
  /** Mirror of the scroll offset for parallax effects. Only wired on non-tabAware
      screens (tab screens already own the scroll handler for the tab bar). */
  scrollOffsetY?: SharedValue<number>
}

export function Screen({ children, scroll = true, tabAware = true, overlay, overlayPadding = 0, scrollRef, onRefresh, gradient, wallpaper, bgColor, contentGap, headerOverlay = false, scrollOffsetY }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const { setVisible, resetScrollTracking } = useFloatingTabBarVisibility()
  // Mirror navigation focus into a shared value so the scroll worklet can ignore
  // events from this screen while it's a backgrounded (but still-mounted) tab.
  const isFocused = useIsFocused()
  const focusedSV = useSharedValue(isFocused)
  focusedSV.value = isFocused
  const scrollHandler = useTabScrollHandler(focusedSV)
  const offsetHandler = useAnimatedScrollHandler((e) => {
    if (scrollOffsetY) scrollOffsetY.value = e.contentOffset.y
  })
  const bottomPad = spacing.xxl + (tabAware ? getFloatingTabBarSpace(insets.bottom) : 12) + overlayPadding
  const topPad = headerOverlay ? insets.top + TAB_HEADER_HEIGHT + spacing.sm : spacing.sm
  const [refreshing, setRefreshing] = useState(false)
  const busy = useRef(false)
  // Drives the collapsible RefreshHeader: 0 = closed, 1 = fully open.
  const openProgress = useSharedValue(0)

  useFocusEffect(
    useCallback(() => {
      if (!tabAware) return
      setVisible(true)
      resetScrollTracking()
    }, [tabAware, setVisible, resetScrollTracking])
  )

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || busy.current) return
    busy.current = true
    haptic.light()
    setRefreshing(true)
    // Hold the refresh open for a minimum beat so the branded loading video actually plays
    // (and the header visibly opens) instead of collapsing the instant cached data resolves.
    const MIN_MS = 900
    const started = Date.now()
    try {
      await onRefresh()
    } finally {
      const elapsed = Date.now() - started
      if (elapsed < MIN_MS) await new Promise((r) => setTimeout(r, MIN_MS - elapsed))
      setRefreshing(false)
      busy.current = false
    }
  }, [onRefresh])

  // Expand the header while refreshing, collapse it when done.
  useEffect(() => {
    openProgress.value = withTiming(refreshing ? 1 : 0, { duration: 280 })
  }, [refreshing, openProgress])

  const safeBg = wallpaper ? 'transparent' : (bgColor ?? palette.bg)
  const gap = contentGap ?? spacing.lg

  const inner = (
    <SafeAreaView edges={headerOverlay ? ['bottom', 'left', 'right'] : undefined} style={{ flex: 1, backgroundColor: safeBg }}>
      {gradient && !wallpaper ? (
        <LinearGradient
          pointerEvents="none"
          colors={gradient.colors as never}
          start={gradient.start ?? { x: 0.2, y: 0 }}
          end={gradient.end ?? { x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef as never}
          onScroll={tabAware ? scrollHandler : scrollOffsetY ? offsetHandler : undefined}
          scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              // refreshing stays false so the OS never holds its own empty gap — our
              // collapsible RefreshHeader IS the refresh affordance. onRefresh still fires
              // on each pull-release.
              <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="transparent" colors={['transparent']} />
            ) : undefined
          }
          contentContainerStyle={{
            paddingHorizontal: spacing.page,
            paddingTop: topPad,
            paddingBottom: bottomPad,
          }}
        >
          {onRefresh ? <RefreshHeader progress={openProgress} /> : null}
          <View style={{ gap }}>{children}</View>
        </Animated.ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.page, paddingTop: topPad, paddingBottom: bottomPad, gap }}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  )

  if (wallpaper) {
    return <WallpaperBackground>{inner}</WallpaperBackground>
  }
  return inner
}
