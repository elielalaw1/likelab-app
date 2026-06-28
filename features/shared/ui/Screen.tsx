import { ReactNode, RefObject, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { spacing } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { WallpaperBackground } from '@/features/shared/ui/WallpaperBackground'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { getFloatingTabBarSpace } from '@/features/navigation/floatingTabBar.constants'
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
  // When false the screen skips its own top safe-area inset — used by the tab
  // screens whose notch space is owned by the persistent header above the pager.
  topInset?: boolean
}

export function Screen({ children, scroll = true, tabAware = true, overlay, overlayPadding = 0, scrollRef, onRefresh, gradient, wallpaper, bgColor, contentGap, topInset = true }: Props) {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const { reportScroll, setVisible, resetScrollTracking } = useFloatingTabBarVisibility()
  const bottomPad = spacing.xxl + (tabAware ? getFloatingTabBarSpace(insets.bottom) : 12) + overlayPadding
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
    <SafeAreaView edges={topInset ? undefined : ['bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: safeBg }}>
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
            paddingTop: spacing.sm,
            paddingBottom: bottomPad,
            gap: contentGap ?? spacing.lg,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.page, paddingBottom: bottomPad, gap: contentGap ?? spacing.lg }}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  )

  if (wallpaper) {
    return <WallpaperBackground>{inner}</WallpaperBackground>
  }
  return inner
}
