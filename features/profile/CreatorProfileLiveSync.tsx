import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type Props = {
  userId?: string
}

export function CreatorProfileLiveSync({ userId }: Props) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return
    let channel: ReturnType<typeof supabase.channel> | null = null

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' })
    }

    channel = supabase
      .channel(`creator-profile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creator_profiles', filter: `user_id=eq.${userId}` },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
        }
      })

    // Realtime events that arrive while the app is backgrounded are NOT replayed on
    // reconnect, so a status change made in admin while the app was away would be missed.
    // Force a refetch every time the app returns to the foreground to catch it.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
      appStateSub.remove()
    }
  }, [queryClient, userId])

  return null
}
