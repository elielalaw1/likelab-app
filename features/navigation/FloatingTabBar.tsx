import { colors } from '@/features/core/theme'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { FLOATING_TAB_BAR_HEIGHT, getFloatingTabBarBottomOffset } from '@/features/navigation/floatingTabBar.constants'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useQueryClient } from '@tanstack/react-query'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function TabIcon({ focused, name }: { focused: boolean; name: string }) {
  const progress = useSharedValue(focused ? 1 : 0)

  useEffect(() => {
    progress.value = focused
      ? withSpring(1, { damping: 13, stiffness: 300, mass: 0.65 })
      : withTiming(0, { duration: 170 })
  }, [focused, progress])

  const entry = iconMap[name as keyof typeof iconMap]

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.82, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [2, -1]) },
    ],
  }))
  const activeStyle = useAnimatedStyle(() => ({ opacity: progress.value }))
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }))

  return (
    <Animated.View style={[{ width: 24, height: 24 }, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, activeStyle]}>
        <MaterialCommunityIcons name={entry?.active || 'circle'} size={23} color={colors.foreground} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, inactiveStyle]}>
        <MaterialCommunityIcons name={entry?.inactive || 'circle-outline'} size={22} color={colors.mutedForeground} />
      </Animated.View>
    </Animated.View>
  )
}

const iconMap = {
  overview: { active: 'view-dashboard', inactive: 'view-dashboard-outline' },
  campaigns: { active: 'bullhorn', inactive: 'bullhorn-outline' },
  applications: { active: 'file-document', inactive: 'file-document-outline' },
  deliverables: { active: 'package-variant', inactive: 'package-variant-closed' },
  profile: { active: 'account-circle', inactive: 'account-circle-outline' },
} as const
const visibleTabNames = new Set(['overview', 'deliverables', 'profile'])
const BAR_HORIZONTAL_PADDING = 8

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { visible } = useFloatingTabBarVisibility()
  const queryClient = useQueryClient()
  const hiddenProgress = useSharedValue(0)
  const bubbleLeft = useSharedValue(-100)
  const bubbleScale = useSharedValue(1)
  const bubbleInitialized = useRef(false)
  const [barWidth, setBarWidth] = useState(0)
  const [tabCenters, setTabCenters] = useState<Record<string, number>>({})
  const bottomOffset = getFloatingTabBarBottomOffset(insets.bottom)

  useEffect(() => {
    hiddenProgress.value = withTiming(visible ? 0 : 1, { duration: 220 })
  }, [visible, hiddenProgress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - hiddenProgress.value,
    transform: [{ translateY: hiddenProgress.value * (FLOATING_TAB_BAR_HEIGHT + bottomOffset + 24) }],
  }))

  const routes = state.routes.filter((route) => visibleTabNames.has(route.name))
  const activeKey = state.routes[state.index]?.key
  const activeVisibleIndex = useMemo(() => {
    const idx = routes.findIndex((route) => route.key === activeKey)
    return idx >= 0 ? idx : 0
  }, [activeKey, routes])
  const slotWidth = barWidth > 0 ? (barWidth - BAR_HORIZONTAL_PADDING * 2) / Math.max(routes.length, 1) : 0
  const bubbleWidth = Math.min(56, Math.max(48, slotWidth - 16))

  // Snap to correct position as soon as tab centers are measured
  useEffect(() => {
    const center = activeKey ? tabCenters[activeKey] : undefined
    if (typeof center !== 'number') return
    const target = center - bubbleWidth / 2
    if (!bubbleInitialized.current) {
      bubbleLeft.value = target
      bubbleInitialized.current = true
    }
  }, [activeKey, tabCenters, bubbleWidth, bubbleLeft])

  // Spring animation only on deliberate tab switch
  useEffect(() => {
    const center = activeKey ? tabCenters[activeKey] : undefined
    if (typeof center !== 'number' || !bubbleInitialized.current) return
    const target = center - bubbleWidth / 2
    bubbleLeft.value = withSpring(target, { damping: 20, stiffness: 160, mass: 0.8 })
    bubbleScale.value = withSequence(withTiming(1.1, { duration: 100 }), withTiming(1, { duration: 200 }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const bubbleStyle = useAnimatedStyle(() => ({
    left: bubbleLeft.value,
    transform: [{ scale: bubbleScale.value }],
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 11,
          right: 11,
          bottom: bottomOffset,
          height: FLOATING_TAB_BAR_HEIGHT,
          borderRadius: 30,
          borderWidth: 1,
          borderColor: 'rgba(15,23,42,0.08)',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: BAR_HORIZONTAL_PADDING,
          shadowColor: '#0F172A',
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          zIndex: 80,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
    >
      <BlurView
        tint="light"
        intensity={72}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(248,250,252,0.68)', 'rgba(255,255,255,0.52)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={{ position: 'absolute', left: 1, right: 1, top: 1, height: 12, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.06)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 12,
            width: bubbleWidth,
            height: 42,
            borderRadius: 999,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.86)',
            shadowColor: 'rgba(109,40,217,1)',
            shadowOpacity: 0.18,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 4 },
          },
          bubbleStyle,
        ]}
      >
        <BlurView
          tint="light"
          intensity={48}
          style={{ position: 'absolute', inset: 0 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.72)', 'rgba(239,233,255,0.52)', 'rgba(228,246,255,0.32)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', inset: 0, borderRadius: 999 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0.08, y: 0.02 }}
          end={{ x: 0.88, y: 0.72 }}
          style={{ position: 'absolute', inset: 0, borderRadius: 999 }}
        />
        <LinearGradient
          colors={['rgba(139,92,246,0.16)', 'rgba(56,189,248,0.1)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0, borderRadius: 999 }}
        />
      </Animated.View>
      {routes.map((route) => {
        const focused = state.routes[state.index].key === route.key
        const descriptor = descriptors[route.key]
        const name = route.name

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (focused && name === 'overview') {
            // Discreet Home refresh: keep UI instant, update data silently in background.
            queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' })
            queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
            queryClient.invalidateQueries({ queryKey: ['campaigns'], refetchType: 'active' })
            queryClient.invalidateQueries({ queryKey: ['applications'], refetchType: 'active' })
            return
          }

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params)
          }
        }

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          })
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
            testID={descriptor.options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout
              const center = x + width / 2
              setTabCenters((prev) => (prev[route.key] === center ? prev : { ...prev, [route.key]: center }))
            }}
            style={{
              flex: 1,
              minHeight: 56,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <TabIcon focused={focused} name={name} />
          </Pressable>
        )
      })}
    </Animated.View>
  )
}
