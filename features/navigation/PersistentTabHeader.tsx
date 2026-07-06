import { useEffect } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { glass, redesign, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useCreatorProfile, useReputation } from '@/features/profile/hooks'
import { TierRing } from '@/features/profile/ui/TierBadge'
import { scrollEvents } from '@/features/navigation/scrollEvents'
import { useFloatingTabBarVisibility } from '@/features/navigation/FloatingTabBarVisibility'
import { TAB_HEADER_HEIGHT } from '@/features/navigation/floatingTabBar.constants'
import { WhatsNewButton } from '@/features/whatsnew/WhatsNewModal'

const topLogo = require('@/assets/images/likelablogonew.png')

// A frosted-glass header that stays put while the tab pager swipes (and content
// scrolls) underneath. The avatar wears the creator's tier ring and crossfades to a
// settings cog on the Profile tab; a hairline + shadow fade in as you scroll.
export function PersistentTabHeader() {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments()
  const { data: profile } = useCreatorProfile()
  const { tier } = useReputation()
  const { scrollY, headerOffset } = useFloatingTabBarVisibility()

  const onProfile = segments[segments.length - 1] === 'profile'

  const t = useSharedValue(onProfile ? 1 : 0)
  useEffect(() => {
    t.value = withTiming(onProfile ? 1 : 0, { duration: 240 })
  }, [onProfile, t])

  const avatarStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value }))
  const cogStyle = useAnimatedStyle(() => ({ opacity: t.value }))

  // Slide/fade the header continuously with the scroll gesture — smooth, no snap.
  const hideY = -(insets.top + TAB_HEADER_HEIGHT + 12)
  const headerStyle = useAnimatedStyle(() => ({
    opacity: 1 - headerOffset.value,
    transform: [{ translateY: headerOffset.value * hideY }],
  }))

  // Glass + edge fade in only once content is scrolling under the header. At the very
  // top there's nothing behind it, so it blends seamlessly into the background.
  const glassStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 22], [0, 1], Extrapolation.CLAMP) }))
  const shadowStyle = useAnimatedStyle(() => ({ shadowOpacity: interpolate(scrollY.value, [0, 22], [0, 0.16], Extrapolation.CLAMP) }))
  const hairlineStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 22], [0, 1], Extrapolation.CLAMP) }))

  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, shadowColor: '#0B0B0F', shadowRadius: 16, shadowOffset: { width: 0, height: 7 } }, shadowStyle, headerStyle]}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.page }}>
        {/* Frosted glass (same as the bottom tab bar) — fades in on scroll, blended at top */}
        <Animated.View style={[StyleSheet.absoluteFill, glassStyle]}>
          <BlurView tint="light" intensity={glass.blurTabBar} style={[StyleSheet.absoluteFill, { backgroundColor: glass.tabBarBg }]} />
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: TAB_HEADER_HEIGHT }}>
          <Pressable
            onPress={() => {
              router.navigate('/(tabs)/overview')
              scrollEvents.emit('scrollToTop:overview')
            }}
            hitSlop={10}
          >
            <Image source={topLogo} style={{ width: 46, height: 46 }} resizeMode="contain" />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <WhatsNewButton />
            <Pressable
              onPress={() => router.push(onProfile ? '/settings' : '/(tabs)/profile')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={onProfile ? 'Settings' : 'Profile'}
              style={{ width: 40, height: 40 }}
            >
              {/* Avatar with the creator's tier ring — fades out on the Profile tab */}
              <Animated.View style={[StyleSheet.absoluteFill, avatarStyle]}>
                <TierRing tier={tier.tier} size={40} radius={20} borderWidth={2}>
                  {profile?.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
                      {profile?.displayName?.trim()?.[0]?.toUpperCase() || 'U'}
                    </Text>
                  )}
                </TierRing>
              </Animated.View>

              {/* Settings cog — fades in on the Profile tab (opaque, covers the ring) */}
              <Animated.View style={[StyleSheet.absoluteFill, cogStyle, { borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: redesign.color.card, borderWidth: 1, borderColor: palette.borderColor }]}>
                <MaterialCommunityIcons name="cog-outline" size={21} color={palette.textMuted} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </View>
      <Animated.View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: redesign.color.hairlineStrong }, hairlineStyle]} />
    </Animated.View>
  )
}
