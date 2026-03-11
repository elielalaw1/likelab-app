import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

async function validateSession(currentSession: Session | null) {
  if (!currentSession) return null

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    await supabase.auth.signOut()
    return null
  }

  return currentSession
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(() => {
      if (!mounted) return
      // Failsafe: never block app boot forever.
      setLoading(false)
    }, 4500)

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!mounted) return
        const valid = await validateSession(data.session)
        if (!mounted) return
        setSession(valid)
      } catch {
        if (!mounted) return
        setSession(null)
      } finally {
        if (!mounted) return
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      try {
        const valid = await validateSession(currentSession)
        if (!mounted) return
        setSession(valid)
      } catch {
        if (!mounted) return
        setSession(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
