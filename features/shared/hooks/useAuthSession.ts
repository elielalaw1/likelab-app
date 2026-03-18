import { useSyncExternalStore } from 'react'
import { Session } from '@supabase/supabase-js'
import { clearPersistedSupabaseSession, supabase } from '@/lib/supabase'

type AuthSessionValue = {
  session: Session | null
  loading: boolean
}

let authState: AuthSessionValue = {
  session: null,
  loading: true,
}

const listeners = new Set<() => void>()
let initialized = false

function emit() {
  for (const listener of listeners) listener()
}

function setAuthState(next: AuthSessionValue) {
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
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      setAuthState({ session: data.session, loading: false })
    } catch (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearPersistedSupabaseSession()
      }

      setAuthState({ session: null, loading: false })
    } finally {
      clearTimeout(timeoutId)
    }
  })()

  supabase.auth.onAuthStateChange((_event, currentSession) => {
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
