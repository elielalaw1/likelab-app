import { useEffect } from 'react'
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

    channel = supabase
      .channel(`creator-profile:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creator_profiles', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['creator-profile'], refetchType: 'active' })
          queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'active' })
        }
      )
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [queryClient, userId])

  return null
}
