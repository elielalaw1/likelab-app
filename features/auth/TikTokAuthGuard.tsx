import { useEffect, useRef } from 'react'
import { router, useSegments } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/features/shared/ui/Toast'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

// Unauthenticated / pre-login routes where we must never force a TikTok reconnect.
const AUTH_ROUTE_SEGMENTS = new Set([
  'login',
  'signup',
  'forgot-password',
  'reset-password',
  'welcome',
  'check-email',
  'verify-otp',
  'invite',
  'index',
])

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
  const { session } = useAuthSession()
  const segments = useSegments()
  const lastTriggerAt = useRef<number>(0)

  // Mirror session/route into refs so the cache subscription reads the latest values
  // without needing to resubscribe on every navigation.
  const sessionRef = useRef(session)
  sessionRef.current = session
  const segmentsRef = useRef(segments)
  segmentsRef.current = segments

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== 'updated') return
      const err = event.query.state.error
      if (!looksLikeTikTokAuthError(err)) return

      // Only act on a TikTok auth error when there's an active session AND we're inside
      // the authenticated app area. A stale TikTok query can fire while the user is
      // logged out or sitting on the login screen — redirecting then is wrong.
      if (!sessionRef.current) return
      const currentSegments = segmentsRef.current
      // Already on the connect screen — don't stack a duplicate route.
      if (currentSegments[0] === 'connect-tiktok') return
      const inAuthedApp =
        currentSegments[0] === '(tabs)' || !AUTH_ROUTE_SEGMENTS.has(currentSegments[0] ?? 'index')
      if (!inAuthedApp) return

      const now = Date.now()
      if (now - lastTriggerAt.current < 5000) return
      lastTriggerAt.current = now

      void (async () => {
        // We already matched a HARD TikTok auth-invalidation error (revoked /
        // expired / invalid_grant) for a signed-in creator inside the app, with a
        // 5s cooldown. Don't gate on the derived `tiktokConnected` flag — it stays
        // truthy while tiktok_open_id is set — just refresh and prompt a reconnect.
        await queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
        toast.error('TikTok disconnected — reconnect to keep using LikeLab.')
        router.replace('/connect-tiktok')
      })()
    })

    return unsubscribe
  }, [queryClient])

  return null
}
