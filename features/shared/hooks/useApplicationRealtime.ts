import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/features/shared/ui/Toast'

export function useApplicationRealtime(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`application-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: `creator_id=eq.${userId}` },
        (payload) => {
          const oldStatus = (payload.old as Record<string, unknown>)?.status
          const newStatus = (payload.new as Record<string, unknown>)?.status

          if (oldStatus !== newStatus) {
            queryClient.invalidateQueries({ queryKey: ['applications'] })
            queryClient.invalidateQueries({ queryKey: ['campaigns'] })
          }

          if (oldStatus !== 'accepted' && newStatus === 'accepted') {
            queryClient.invalidateQueries({ queryKey: ['deliverables'] })
            toast.success('Your application was accepted! 🎉')
          } else if (oldStatus === 'applied' && newStatus === 'rejected') {
            toast.error('Your application was not accepted.')
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Invalidate so next mount gets fresh data via polling
          queryClient.invalidateQueries({ queryKey: ['applications'] })
          queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
