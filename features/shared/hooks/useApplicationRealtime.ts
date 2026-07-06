import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from '@/features/shared/ui/Toast'

// Set when the creator accepts an invitation locally (applications.tsx shows its
// own success toast). The realtime listener reads this to avoid a duplicate
// "accepted" toast for the same action.
let lastLocalAcceptAt = 0
export function markLocalInvitationAccept() {
  lastLocalAcceptAt = Date.now()
}

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
            // Skip if the creator just accepted locally (applications.tsx already
            // showed a success toast) — otherwise it double-fires.
            if (Date.now() - lastLocalAcceptAt > 6000) {
              toast.success('Your application was accepted')
            }
          } else if (newStatus === 'rejected' && oldStatus !== 'rejected') {
            // Rely on payload.new only — payload.old.status is absent unless the
            // table has REPLICA IDENTITY FULL, which would otherwise drop this toast.
            toast.error('Your application was not accepted.')
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_invitations', filter: `creator_id=eq.${userId}` },
        (payload) => {
          // Best-effort: only fires if campaign_invitations is in the Live realtime
          // publication. The applications screen's focus refetch is the dependable
          // path; this just surfaces new invites without navigating away.
          queryClient.invalidateQueries({ queryKey: ['applications'] })
          const newStatus = (payload.new as Record<string, unknown>)?.status
          if (payload.eventType === 'INSERT' && newStatus === 'pending') {
            toast.info('New campaign invitation')
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
