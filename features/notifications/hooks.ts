import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/features/core/supabase-utils'

type NotificationRow = {
  id: string
  user_id: string
  title?: string | null
  message?: string | null
  link?: string | null
  read?: boolean | null
  created_at?: string | null
}

type NotificationsContextValue = {
  notifications: NotificationRow[]
  unreadCount: number
  loading: boolean
  markAllAsRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const load = async () => {
      try {
        const uid = await getCurrentUserId()
        if (!mounted) return
        setUserId(uid)

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!mounted) return
        if (!error) setNotifications((data || []) as NotificationRow[])

        channel = supabase
          .channel(`notifications:${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
            () => {
              supabase
                .from('notifications')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false })
                .limit(50)
                .then((res) => {
                  if (!mounted || res.error) return
                  setNotifications((res.data || []) as NotificationRow[])
                })
            }
          )
          .subscribe()
      } catch {
        if (!mounted) return
        setUserId(null)
        setNotifications([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    const unreadIds = notifications.filter((item) => item.read !== true).map((item) => item.id)
    if (!unreadIds.length) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .in('id', unreadIds)

    if (error) throw new Error(error.message)

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [notifications, userId])

  const unreadCount = useMemo(() => notifications.filter((item) => item.read !== true).length, [notifications])

  const value = useMemo(
    () => ({ notifications, unreadCount, loading, markAllAsRead }),
    [notifications, unreadCount, loading, markAllAsRead]
  )

  return createElement(NotificationsContext.Provider, { value }, children)
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }
  return ctx
}
