import { useSyncExternalStore } from 'react'
import { Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { clearPersistedSupabaseSession, supabase } from '@/lib/supabase'
import { assertCreatorRole } from '@/lib/assert-creator-role'
import { deletePushToken } from '@/features/notifications/push'

const FIRST_LAUNCH_KEY = 'likelab_first_launch_v1'

async function clearSessionOnFirstLaunch(): Promise<void> {
  try {
    const seen = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY)
    if (!seen) {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, '1')
      await clearPersistedSupabaseSession()
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
      }

      setAuthState({ session: data.session, loading: false })
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearPersistedSupabaseSession()
        await supabase.auth.signOut({ scope: 'local' })
      }

      setAuthState({ session: null, loading: false })
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
      setAuthState({ session: null, loading: false })
      return
    }

    if (event === 'TOKEN_REFRESHED' && !currentSession) {
      await clearPersistedSupabaseSession()
    }

    if (event === 'TOKEN_REFRESHED' && currentSession?.user) {
      const isCreator = await assertCreatorRole(currentSession.user.id)
      if (!isCreator) {
        return
      }
    }

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
