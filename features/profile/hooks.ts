import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCreatorProfile, updateCreatorProfile } from '@/features/profile/api'

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
      const status = (query.state.data?.reviewStatus || '').toLowerCase().trim()
      return status === 'approved' ? 60_000 : 5_000
    },
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  })
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
