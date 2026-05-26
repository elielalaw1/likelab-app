import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, Easing, ImageBackground, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { connectTikTokAccount } from '@/features/auth/tiktok'
import { designBackground } from '@/design/assets'
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

  const handleContinue = () => {
    setExiting(true)
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)/overview')
    })
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#F7F6F2', opacity: fadeAnim }}>
      <ImageBackground
        source={designBackground}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        resizeMode="cover"
      />
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D7DFEE', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 32, gap: 20, alignItems: 'center' }}>
          {connected ? (
            <>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#0ABF53', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="check-bold" size={36} color="#fff" />
              </View>

              <View style={{ gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#060B1F', fontFamily: 'Montserrat', textAlign: 'center' }}>
                  TikTok Connected
                </Text>
                <Text style={{ fontSize: 14, color: '#687C9E', fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 20 }}>
                  Your profile, stats, and avatar have been imported. You can now access campaigns and deliverables.
                </Text>
              </View>

              <Pressable
                onPress={handleContinue}
                disabled={exiting}
                style={{ width: '100%', height: 54, borderRadius: 20, backgroundColor: '#060B1F', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, opacity: exiting ? 0.7 : 1 }}
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
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#060B1F', fontFamily: 'Montserrat', textAlign: 'center' }}>
                  Connect your TikTok
                </Text>
                <Text style={{ fontSize: 14, color: '#687C9E', fontFamily: 'Montserrat', textAlign: 'center', lineHeight: 20 }}>
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
