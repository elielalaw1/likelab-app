import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { useCreatorProfile } from '@/features/profile/hooks'

const RECONNECT_PROMPT_KEY = 'tiktok_reconnect_prompt_last_shown'
const COOLDOWN_MS = 24 * 60 * 60 * 1000

/**
 * Once per 24h, when the user has TikTok connected but missing tiktokUsername
 * (legacy basic-scope connection), auto-route to /connect-tiktok on first
 * profile load. User can back out — cooldown prevents re-trigger same day.
 */
export function ReconnectAutoRoute() {
  const { data: profile } = useCreatorProfile()
  const triggeredThisMount = useRef(false)

  useEffect(() => {
    if (!profile || triggeredThisMount.current) return

    const needsReconnect =
      profile.tiktokConnected &&
      !profile.tiktokUsername &&
      (!profile.tiktokHandle || /^https?:\/\//i.test(profile.tiktokHandle))

    if (!needsReconnect) return

    triggeredThisMount.current = true

    void (async () => {
      const lastShown = await SecureStore.getItemAsync(RECONNECT_PROMPT_KEY).catch(() => null)
      const lastTimestamp = lastShown ? Number(lastShown) : 0
      if (Date.now() - lastTimestamp < COOLDOWN_MS) return

      await SecureStore.setItemAsync(RECONNECT_PROMPT_KEY, String(Date.now())).catch(() => {})
      router.push('/connect-tiktok')
    })()
  }, [profile])

  return null
}
