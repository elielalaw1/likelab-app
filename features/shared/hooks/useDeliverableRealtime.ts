import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Live updates for the creator's own deliverables. Without this, a brand approving a
// video (which flips approval_status → 'approved' / ready_for_posting → true) never
// reaches the open app, so the "paste your TikTok link" field doesn't appear until a
// manual pull-to-refresh. Invalidating ['deliverables'] also covers the campaign-
// scoped key ['deliverables','campaign',id] via prefix matching.
//
// NOTE: requires the `deliverables` table to be in the Supabase realtime publication
// on Live. If it isn't, this stays silent and the foreground-notification fallback in
// app/_layout.tsx is what refreshes the screen.
export function useDeliverableRealtime(userId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`deliverable-updates-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliverables', filter: `creator_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deliverables'] })
          // A brand approving a deliverable grants XP server-side, so refresh the
          // real account level too — otherwise the tier ring and the level-up
          // celebration stay stale for the whole session.
          queryClient.invalidateQueries({ queryKey: ['creator-level'] })
        }
      )
      // Brand feedback arriving while the app is open — refresh the per-deliverable thread
      // and the unread badge. The denormalized creator_id makes this filterable just like
      // the deliverables table above.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliverable_feedback', filter: `creator_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['deliverable-feedback'] })
          queryClient.invalidateQueries({ queryKey: ['feedback-unread'] })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          queryClient.invalidateQueries({ queryKey: ['deliverables'] })
          queryClient.invalidateQueries({ queryKey: ['feedback-unread'] })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
