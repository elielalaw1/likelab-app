import { useEffect } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { redesign, spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { scrollEvents } from '@/features/navigation/scrollEvents'
import { WhatsNewButton } from '@/features/whatsnew/WhatsNewModal'

const topLogo = require('@/assets/images/likelablogonew.png')

// A single header that stays put while the tab pager swipes underneath. The right
// side crossfades between the profile avatar (on Discover/Projects) and a settings
// cog (on Profile), since the profile screen already shows the avatar.
export function PersistentTabHeader() {
  const { palette } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments()
  const { data: profile } = useCreatorProfile()

  const onProfile = segments[segments.length - 1] === 'profile'

  const t = useSharedValue(onProfile ? 1 : 0)
  useEffect(() => {
    t.value = withTiming(onProfile ? 1 : 0, { duration: 240 })
  }, [onProfile, t])

  const avatarStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value }))
  const cogStyle = useAnimatedStyle(() => ({ opacity: t.value }))

  return (
    <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.page, backgroundColor: redesign.color.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
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
            style={{ width: 38, height: 38 }}
          >
            {/* Avatar — fades out on the profile tab */}
            <Animated.View style={[StyleSheet.absoluteFill, avatarStyle]}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
              ) : (
                <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,31,42,0.06)', borderWidth: 1, borderColor: palette.borderColor }}>
                  <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
                    {profile?.displayName?.trim()?.[0]?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Settings cog — fades in on the profile tab */}
            <Animated.View style={[StyleSheet.absoluteFill, cogStyle, { borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,31,42,0.06)', borderWidth: 1, borderColor: palette.borderColor }]}>
              <MaterialCommunityIcons name="cog-outline" size={21} color={palette.textMuted} />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
