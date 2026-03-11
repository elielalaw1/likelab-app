import { ReactNode, RefObject } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { palette, spacing } from '@/features/core/theme'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { getFloatingTabBarSpace } from '@/features/navigation/floatingTabBar.constants'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'

type Props = {
  children: ReactNode
  scroll?: boolean
  tabAware?: boolean
  overlay?: ReactNode
  overlayPadding?: number
  scrollRef?: RefObject<ScrollView | null>
}

export function Screen({ children, scroll = true, tabAware = true, overlay, overlayPadding = 0, scrollRef }: Props) {
  const insets = useSafeAreaInsets()
  const { reportScroll, setVisible, resetScrollTracking } = useFloatingTabBarVisibility()
  const bottomPad = spacing.xxl + (tabAware ? getFloatingTabBarSpace(insets.bottom) : 12) + overlayPadding

  useFocusEffect(
    useCallback(() => {
      if (!tabAware) return
      setVisible(true)
      resetScrollTracking()
    }, [tabAware, setVisible, resetScrollTracking])
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onScroll={tabAware ? (event) => reportScroll(event.nativeEvent.contentOffset.y) : undefined}
          scrollEventThrottle={16}
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
