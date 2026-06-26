import { useQuery } from '@tanstack/react-query'
import { getReferralStats } from '@/features/referral/api'

export function useReferral() {
  return useQuery({
    queryKey: ['referral'],
    queryFn: getReferralStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
}
