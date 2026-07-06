import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { connectTikTokAccount } from '@/features/auth/tiktok'
import { redesign, typography } from '@/features/core/theme'
import { useQueryClient } from '@tanstack/react-query'

export default function ConnectTikTokPage() {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [exiting, setExiting] = useState(false)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const queryClient = useQueryClient()

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const result = await connectTikTokAccount()
      if (!result) {
        return
      }

      await queryClient.refetchQueries({ queryKey: ['creator-profile'] })
      setConnected(true)
    } catch (error) {
      Alert.alert(
        'Connection failed',
        error instanceof Error ? error.message : 'Could not connect your TikTok account. Please try again.'
      )
    } finally {
      setConnecting(false)
    }
  }

  const fadeOut = (onDone: () => void) => {
    setExiting(true)
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(onDone)
  }

  const handleContinue = () => {
    // Return to wherever reconnect was triggered from (e.g. the deliverable the
    // creator was posting) instead of always dumping them on the overview tab.
    fadeOut(() => {
      if (router.canGoBack()) router.back()
      else router.replace('/(tabs)/overview')
    })
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: redesign.color.bg, opacity: fadeAnim }}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(99,80,184,0.08)', 'rgba(99,80,184,0.02)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.5 }}
        style={{ position: 'absolute', top: 0, right: 0, width: 360, height: 360 }}
      />

      <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 32, gap: 20, alignItems: 'center', ...redesign.shadow.card }}>
          {connected ? (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#0ABF53', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="check-bold" size={36} color="#fff" />
              </View>

              <View style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                  TikTok Connected
                </Text>
                <Text style={{ fontSize: 14, color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center', lineHeight: 20 }}>
                  Your profile, stats, and avatar have been imported. You can now access campaigns and deliverables.
                </Text>
              </View>

              <Pressable
                onPress={handleContinue}
                disabled={exiting}
                style={{ width: '100%', height: 54, borderRadius: 999, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: exiting ? 0.7 : 1 }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Montserrat' }}>
                  Continue
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome5 name="tiktok" size={32} color="#fff" />
              </View>

              <View style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
                  Connect your TikTok
                </Text>
                <Text style={{ fontSize: 14, color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center', lineHeight: 20 }}>
                  We will import your profile picture, handle, and stats automatically. No manual entry needed.
                </Text>
              </View>

              <Pressable
                onPress={handleConnect}
                disabled={connecting}
                style={{ width: '100%', height: 54, borderRadius: 20, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: connecting ? 0.7 : 1 }}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FontAwesome5 name="tiktok" size={18} color="#fff" />
                )}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Montserrat' }}>
                  {connecting ? 'Connecting...' : 'Connect TikTok'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </Animated.View>
  )
}
