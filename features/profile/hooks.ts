import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCreatorProfile, updateCreatorProfile } from '@/features/profile/api'
import { useDeliverables } from '@/features/deliverables/hooks'
import { computeReputation, countCompletedDeliverables, type Reputation } from '@/features/profile/reputation'
import { computeTier, type TierProgress } from '@/features/profile/tiers'

const queryPerf = {
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
}

export function useCreatorProfile() {
  return useQuery({
    queryKey: ['creator-profile'],
    queryFn: getCreatorProfile,
    ...queryPerf,
    // Realtime is primary. Polling is the fallback when realtime isn't delivering
    // (e.g. table not enabled for realtime, or the change is made while the app sits
    // foregrounded on a phone and the admin toggles status from a computer).
    // Poll aggressively while awaiting approval (short-lived state where the user is
    // actively waiting and the approval should feel instant); keep a slower poll once
    // approved so a downgrade (approved -> pending/rejected) is still detected.
    refetchInterval: (query) => {
      // No data yet (logged out / pre-load) → don't poll. Otherwise this query —
      // which has a live observer even on the login/signup screens — churns every
      // 5s while signed out. Realtime + manual refetch cover the gap.
      if (!query.state.data) return false
      const status = (query.state.data.reviewStatus || '').toLowerCase().trim()
      return status === 'approved' ? 60_000 : 5_000
    },
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  })
}

// Creator reputation + tier, derived from completed deliverables. This is the
// SINGLE place that turns app data into a creator's standing — every surface
// (profile strip, /tiers screen, future brand/admin views) should read from here.
//
// Backend swap: when Lovable exposes on-time / quality / reach, pass them into
// computeReputation() below (the rates are already optional inputs) and the
// "coming soon" signals light up with zero UI changes.
export function useReputation(): { reputation: Reputation; tier: TierProgress } {
  const { data: deliverables } = useDeliverables()
  return useMemo(() => {
    const completed = countCompletedDeliverables(deliverables)
    return {
      reputation: computeReputation({ completed }),
      tier: computeTier({ completedDeliverables: completed }),
    }
  }, [deliverables])
}

export function useUpdateCreatorProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCreatorProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
