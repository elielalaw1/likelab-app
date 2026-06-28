import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCreatorLevel, getCreatorProfile, updateCreatorProfile } from '@/features/profile/api'
import { computeLevelProgress, type TierProgress } from '@/features/profile/tiers'

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

// Creator account level + tier progress, read from the REAL backend `creator_levels`
// view (XP earned from brand-approved deliverables, campaign completions, leaderboard
// placements). The single place every surface (profile strip, /tiers screen) reads
// the creator's standing from. RLS scopes it to the creator's own row.
export function useReputation(): { tier: TierProgress } {
  const { data } = useQuery({
    queryKey: ['creator-level'],
    queryFn: getCreatorLevel,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    placeholderData: (prev) => prev,
  })
  return useMemo(() => ({ tier: computeLevelProgress(data?.xp ?? 0, data?.level ?? 1) }), [data])
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
