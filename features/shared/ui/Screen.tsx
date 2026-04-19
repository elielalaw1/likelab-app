import { ReactNode, RefObject, useState, useCallback } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { palette, spacing } from '@/features/core/theme'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { getFloatingTabBarSpace } from '@/features/navigation/floatingTabBar.constants'
import { useFocusEffect } from '@react-navigation/native'

type Props = {
  children: ReactNode
  scroll?: boolean
  tabAware?: boolean
  overlay?: ReactNode
  overlayPadding?: number
  scrollRef?: RefObject<ScrollView | null>
  onRefresh?: () => Promise<void>
}

export function Screen({ children, scroll = true, tabAware = true, overlay, overlayPadding = 0, scrollRef, onRefresh }: Props) {
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
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
            gap: spacing.lg,
          }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.page, paddingBottom: bottomPad, gap: spacing.lg }}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  )
}
