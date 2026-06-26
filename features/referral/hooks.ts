import { useQuery } from '@tanstack/react-query'
import { getReferralStats } from '@/features/referral/api'

export function useReferral() {
  return useQuery({
    queryKey: ['referral'],
    queryFn: getReferralStats,
    // Short stale time + refetch on mount so a real backend code replaces a once-
    // cached local fallback promptly once the backend goes live (overrides the
    // global query client defaults that disable refetchOnMount).
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    placeholderData: (previous) => previous,
  })
}
