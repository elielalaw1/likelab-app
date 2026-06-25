import { useQuery } from '@tanstack/react-query'
import { getInsights } from '@/features/insights/api'

export function useInsights() {
  return useQuery({
    queryKey: ['insights'],
    queryFn: getInsights,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
}
