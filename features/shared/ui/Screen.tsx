import { ReactNode, RefObject, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { spacing } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { WallpaperBackground } from '@/features/shared/ui/WallpaperBackground'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { getFloatingTabBarSpace, TAB_HEADER_HEIGHT } from '@/features/navigation/floatingTabBar.constants'
import { useFocusEffect } from '@react-navigation/native'

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
}

export function Screen({ children, scroll = true, tabAware = true, overlay, overlayPadding = 0, scrollRef, onRefresh, gradient, wallpaper, bgColor, contentGap, headerOverlay = false }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const { reportScroll, setVisible, resetScrollTracking } = useFloatingTabBarVisibility()
  const bottomPad = spacing.xxl + (tabAware ? getFloatingTabBarSpace(insets.bottom) : 12) + overlayPadding
  const topPad = headerOverlay ? insets.top + TAB_HEADER_HEIGHT + spacing.sm : spacing.sm
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!tabAware) return
      setVisible(true)
      resetScrollTracking()
    }, [tabAware, setVisible, resetScrollTracking])
  )

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }, [onRefresh])

  const safeBg = wallpaper ? 'transparent' : (bgColor ?? palette.bg)

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
        <ScrollView
          ref={scrollRef}
          onScroll={tabAware ? (event) => reportScroll(event.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.text} /> : undefined}
          contentContainerStyle={{
            paddingHorizontal: spacing.page,
            paddingTop: topPad,
            paddingBottom: bottomPad,
            gap: contentGap ?? spacing.lg,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.page, paddingTop: topPad, paddingBottom: bottomPad, gap: contentGap ?? spacing.lg }}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  )

  if (wallpaper) {
    return <WallpaperBackground>{inner}</WallpaperBackground>
  }
  return inner
}
