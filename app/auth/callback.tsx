import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import * as Linking from 'expo-linking'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'

function parseTokensFromUrl(url: string): { accessToken?: string; refreshToken?: string } {
  const hash = url.split('#')[1] ?? ''
  const hashParams = Object.fromEntries(new URLSearchParams(hash))
  const queryParams = Object.fromEntries(new URLSearchParams(url.split('?')[1] ?? ''))
  return {
    accessToken: hashParams['access_token'] ?? queryParams['access_token'],
    refreshToken: hashParams['refresh_token'] ?? queryParams['refresh_token'],
  }
}

export default function AuthCallback() {
  const params = useLocalSearchParams()

  useEffect(() => {
    async function handle() {
      const url = await Linking.getInitialURL()
      const { accessToken, refreshToken } = url
        ? parseTokensFromUrl(url)
        : {
            accessToken: params['access_token'] as string | undefined,
            refreshToken: params['refresh_token'] as string | undefined,
          }

      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => router.replace('/(tabs)/overview'))
          .catch(() => router.replace('/login'))
      } else {
        router.replace('/login')
      }
    }

    void handle()
  }, [])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
