import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import NetInfo from '@react-native-community/netinfo'
import { typography } from '@/features/core/theme'

// Thin banner pinned to the top whenever the device loses connectivity. React Query
// is already paused via onlineManager (see lib/query-client) — this just makes the
// state visible so a stale screen doesn't look broken.
export function OfflineBanner() {
  const insets = useSafeAreaInsets()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false))
    })
    return unsubscribe
  }, [])

  if (!offline) return null

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}
    >
      <View
        accessibilityRole="alert"
        accessibilityLabel="No internet connection"
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          backgroundColor: '#1C1C24',
        }}
      >
        <MaterialCommunityIcons name="wifi-off" size={14} color="rgba(255,255,255,0.85)" />
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '700' }}>
          No internet connection
        </Text>
      </View>
    </Animated.View>
  )
}
