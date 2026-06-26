import { useEffect } from 'react'
import { View, ActivityIndicator, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import {
  exchangeTikTokCode,
  TIKTOK_APP_RETURN_URI,
  TIKTOK_OAUTH_STATE_KEY,
  TIKTOK_REDIRECT_URI,
} from '@/features/auth/tiktok'

export default function TikTokCallback() {
  const {
    code,
    state,
    error,
    error_description: errorDescription,
  } = useLocalSearchParams<{
    code?: string
    state?: string
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
    const returnedState = state

    async function exchange() {
      try {
        // Validate the OAuth `state` against the value we persisted before opening the
        // auth session. This blocks account-injection via a forged callback deep link
        // (likelabapp:///auth/tiktok/callback?code=<attacker_code>) carrying no/wrong state.
        const expectedState = await SecureStore.getItemAsync(TIKTOK_OAUTH_STATE_KEY)
        if (!returnedState || !expectedState || returnedState !== expectedState) {
          console.warn('TikTok callback rejected: state mismatch', {
            hasReturnedState: Boolean(returnedState),
            hasExpectedState: Boolean(expectedState),
          })
          // Clear any stale persisted state so a future legit flow starts clean.
          await SecureStore.deleteItemAsync(TIKTOK_OAUTH_STATE_KEY).catch(() => {})
          router.replace('/connect-tiktok')
          return
        }

        // One-time use: consume the persisted state before exchanging the code.
        await SecureStore.deleteItemAsync(TIKTOK_OAUTH_STATE_KEY).catch(() => {})

        await exchangeTikTokCode({ code: authCode, redirectUri: TIKTOK_REDIRECT_URI, state: returnedState })
        await queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
        router.replace('/(tabs)/profile')
      } catch (exchangeError) {
        console.warn('TikTok callback exchange failed', exchangeError)
        router.replace('/connect-tiktok')
      }
    }

    void exchange()
  }, [code, state, error, errorDescription, queryClient])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  )
}
