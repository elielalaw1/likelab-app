import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/features/shared/ui/Toast'

const TIKTOK_INVALID_PATTERNS = [
  /TIKTOK_AUTH_INVALID/i,
  /tiktok.*(invalid|expired|revoked).*(token|grant|auth)/i,
  /invalid_grant/i,
]

function looksLikeTikTokAuthError(err: unknown): boolean {
  if (!err) return false
  const candidates: string[] = []
  if (typeof err === 'string') candidates.push(err)
  else if (typeof err === 'object') {
    const r = err as { code?: unknown; message?: unknown; error?: unknown; status?: unknown }
    if (typeof r.code === 'string') candidates.push(r.code)
    if (typeof r.message === 'string') candidates.push(r.message)
    if (typeof r.error === 'string') candidates.push(r.error)
  }
  return candidates.some((s) => TIKTOK_INVALID_PATTERNS.some((p) => p.test(s)))
}

/**
 * Listens for any React Query error mentioning TikTok auth invalidation.
 * On hit:
 *   1. Invalidate creator-profile query so we read the freshest tiktok_connected
 *   2. After a short tick, if tiktok_connected is false, route to /connect-tiktok
 *   3. Show a toast explaining the reconnect requirement
 *
 * Cooldown prevents the redirect from firing repeatedly while a stale query retries.
 */
export function TikTokAuthGuard() {
  const queryClient = useQueryClient()
  const lastTriggerAt = useRef<number>(0)

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== 'updated') return
      const err = event.query.state.error
      if (!looksLikeTikTokAuthError(err)) return

      const now = Date.now()
      if (now - lastTriggerAt.current < 5000) return
      lastTriggerAt.current = now

      void (async () => {
        await queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
        const profile = queryClient.getQueryData<{ tiktokConnected?: boolean | null }>(['creator-profile'])
        if (profile?.tiktokConnected === false) {
          toast.error('TikTok disconnected — reconnect to keep using LikeLab.')
          router.push('/connect-tiktok')
        }
      })()
    })

    return unsubscribe
  }, [queryClient])

  return null
}
