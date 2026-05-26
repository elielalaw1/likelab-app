import { useEffect } from 'react'
import { View, ActivityIndicator, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { exchangeTikTokCode, TIKTOK_APP_RETURN_URI, TIKTOK_REDIRECT_URI } from '@/features/auth/tiktok'

export default function TikTokCallback() {
  const { code, error, error_description: errorDescription } = useLocalSearchParams<{
    code?: string
    error?: string
    error_description?: string
  }>()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search) {
      window.location.replace(`${TIKTOK_APP_RETURN_URI}${window.location.search}`)
      return
    }

    if (error) {
      console.warn('TikTok authorization failed', { error, errorDescription })
      router.replace('/connect-tiktok')
      return
    }

    if (!code) {
      router.replace('/(tabs)/profile')
      return
    }

    const authCode = code

    async function exchange() {
      try {
        await exchangeTikTokCode({ code: authCode, redirectUri: TIKTOK_REDIRECT_URI })
        await queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
        router.replace('/(tabs)/profile')
      } catch (exchangeError) {
        console.warn('TikTok callback exchange failed', exchangeError)
        router.replace('/connect-tiktok')
      }
    }

    void exchange()
  }, [code, error, errorDescription, queryClient])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
