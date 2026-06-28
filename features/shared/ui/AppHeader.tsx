import { Animated, Dimensions, Image, Modal, Pressable, Text, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import ConfettiCannon from 'react-native-confetti-cannon'
import { spacing, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { scrollEvents } from '@/features/navigation/scrollEvents'
import { WhatsNewButton } from '@/features/whatsnew/WhatsNewModal'

const topLogo = require('@/assets/images/likelablogonew.png')
const easterEggGif = require('@/assets/images/easter-egg.gif')
const EASTER_EGG_TAPS = 15
const { width, height } = Dimensions.get('window')

export function AppHeader({ trailing = 'profile' }: { trailing?: 'profile' | 'settings' }) {
  const { palette } = useTheme()
  const { data: profile } = useCreatorProfile()
  const router = useRouter()
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCat, setShowCat] = useState(false)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending easter-egg timers on unmount so they can't fire setState after
  // the header is gone (leaks / setState-after-unmount warnings).
  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current)
    if (confettiTimer.current) clearTimeout(confettiTimer.current)
  }, [])

  const handleLogoPress = () => {
    tapCount.current += 1

    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, 1000)

    if (tapCount.current >= EASTER_EGG_TAPS) {
      tapCount.current = 0
      setShowConfetti(true)
      if (confettiTimer.current) clearTimeout(confettiTimer.current)
      confettiTimer.current = setTimeout(() => {
        setShowConfetti(false)
        setShowCat(true)
      }, 5500)
      return
    }

    router.navigate('/(tabs)/overview')
    scrollEvents.emit('scrollToTop:overview')
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs }}>

      {/* 15 taps — confetti */}
      <Modal visible={showConfetti} transparent animationType="none" statusBarTranslucent>
        <View style={{ flex: 1 }} pointerEvents="none">
          <ConfettiCannon count={200} origin={{ x: width / 2, y: -10 }} autoStart fadeOut explosionSpeed={600} fallSpeed={4500} />
          <ConfettiCannon count={150} origin={{ x: 0, y: height * 0.4 }} autoStart fadeOut explosionSpeed={500} fallSpeed={4000} />
          <ConfettiCannon count={150} origin={{ x: width, y: height * 0.4 }} autoStart fadeOut explosionSpeed={500} fallSpeed={4000} />
        </View>
      </Modal>

      {/* 15 taps (delayed) — cat */}
      <Modal visible={showCat} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowCat(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowCat(false)}>
          <ExpoImage
            source={easterEggGif}
            style={{ width: width, height: width }}
            contentFit="cover"
            autoplay
          />
        </Pressable>
      </Modal>
      <Pressable onPress={handleLogoPress} hitSlop={8}>
        <Image source={topLogo} style={{ width: 78, height: 78 }} resizeMode="contain" />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <WhatsNewButton />
        {trailing === 'settings' ? (
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(23,31,42,0.06)',
              borderWidth: 1,
              borderColor: palette.borderColor,
            }}
          >
            <MaterialCommunityIcons name="cog-outline" size={21} color={palette.textMuted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
            ) : (
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(23,31,42,0.06)',
                  borderWidth: 1,
                  borderColor: palette.borderColor,
                }}
              >
                <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700' }}>
                  {profile?.displayName?.trim()?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}
