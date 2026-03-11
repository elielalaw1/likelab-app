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
    // Realtime is primary. Polling is fallback while account is not approved.
    refetchInterval: (query) => {
      const status = (query.state.data?.reviewStatus || '').toLowerCase().trim()
      return status === 'approved' ? false : 15_000
    },
    refetchIntervalInBackground: true,
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
