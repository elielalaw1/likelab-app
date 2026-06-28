import { useSyncExternalStore } from 'react'
import { Session } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications'
import { File, Paths } from 'expo-file-system'
import { clearPersistedSupabaseSession, supabase } from '@/lib/supabase'
import { assertCreatorRole, clearCreatorRoleCache } from '@/lib/assert-creator-role'
import { deletePushToken } from '@/features/notifications/push'
import { queryClient } from '@/lib/query-client'
import { getCampaigns } from '@/features/campaigns/api'
import { getApplications } from '@/features/applications/api'
import { getDeliverables } from '@/features/deliverables/api'
import { getCreatorProfile } from '@/features/profile/api'

const FIRST_LAUNCH_MARKER = 'likelab_first_launch_v1'

async function clearSessionOnFirstLaunch(): Promise<void> {
  try {
    // Marker lives in the app sandbox (Documents), which iOS wipes on uninstall.
    // The old SecureStore/Keychain guard SURVIVED reinstall, so the keychain-
    // resident session was never cleared on a fresh install — defeating the point.
    const marker = new File(Paths.document, FIRST_LAUNCH_MARKER)
    if (!marker.exists) {
      await clearPersistedSupabaseSession()
      marker.create()
    }
  } catch {
    // ignore — don't block auth init
  }
}

type AuthSessionValue = {
  session: Session | null
  loading: boolean
}

let authState: AuthSessionValue = {
  session: null,
  loading: true,
}

let lastKnownUserId: string | null = null

const listeners = new Set<() => void>()
let initialized = false

function emit() {
  for (const listener of listeners) listener()
}

function setAuthState(next: AuthSessionValue) {
  if (next.session?.user?.id) {
    lastKnownUserId = next.session.user.id
  }
  authState = next
  emit()
}

function isInvalidRefreshTokenError(error: unknown) {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return message.includes('invalid refresh token') || message.includes('refresh token not found')
}

function initializeAuthSessionStore() {
  if (initialized) return
  initialized = true

  const timeoutId = setTimeout(() => {
    if (!authState.loading) return
    // Failsafe: never block app boot forever.
    setAuthState({ ...authState, loading: false })
  }, 4500)

  void (async () => {
    try {
      await clearSessionOnFirstLaunch()
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      if (data.session?.user) {
        const isCreator = await assertCreatorRole(data.session.user.id)
        if (!isCreator) {
          setAuthState({ session: null, loading: false })
          return
        }

        queryClient.prefetchQuery({ queryKey: ['campaigns'], queryFn: getCampaigns })
        queryClient.prefetchQuery({ queryKey: ['applications'], queryFn: getApplications })
        queryClient.prefetchQuery({ queryKey: ['deliverables'], queryFn: getDeliverables })
        queryClient.prefetchQuery({ queryKey: ['creator-profile'], queryFn: getCreatorProfile })
      }

      setAuthState({ session: data.session, loading: false })
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearPersistedSupabaseSession()
        await supabase.auth.signOut({ scope: 'local' })
        setAuthState({ session: null, loading: false })
      } else {
        // Unknown error (e.g. Supabase SDK internal error) — unblock loading but don't
        // sign out. onAuthStateChange will fire if session state genuinely changes.
        setAuthState({ session: null, loading: false })
      }
    } finally {
      clearTimeout(timeoutId)
    }
  })()

  supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (event === 'SIGNED_OUT') {
      if (lastKnownUserId) {
        void deletePushToken(lastKnownUserId)
        lastKnownUserId = null
      }
      // Reset the app-icon badge so a stale count doesn't persist on the login
      // screen or carry into the next account.
      void Notifications.setBadgeCountAsync(0).catch(() => {})
      void clearCreatorRoleCache()
      setAuthState({ session: null, loading: false })
      return
    }

    if (event === 'TOKEN_REFRESHED' && !currentSession) {
      await clearPersistedSupabaseSession()
      setAuthState({ session: null, loading: false })
      return
    }

    // Don't re-check role on token refresh — role was verified at login and doesn't change.
    // Re-checking here caused random logouts when the DB query returned empty (RLS/network).
    setAuthState({ session: currentSession, loading: false })
  })
}

export function useAuthSession() {
  initializeAuthSessionStore()

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => authState,
    () => authState
  )
}

// Clears this device's push token while STILL authenticated (so RLS lets the
// UPDATE through), then signs out. The post-SIGNED_OUT deletePushToken stays as a
// best-effort fallback, but by then auth.uid() is null and the UPDATE no-ops.
export async function signOutCreator(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (uid) await deletePushToken(uid)
  } catch {
    // best-effort — sign out regardless
  }
  await supabase.auth.signOut()
}
