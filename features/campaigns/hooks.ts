import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyToCampaign, getCampaignById, getCampaignDeliverables, getCampaigns } from '@/features/campaigns/api'

const queryPerf = {
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

export function useCampaign(campaignId?: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId],
    queryFn: () => getCampaignById(campaignId || ''),
    enabled: Boolean(campaignId),
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

export function useCampaignDeliverables(campaignId?: string) {
  return useQuery({
    queryKey: ['deliverables', 'campaign', campaignId],
    queryFn: () => getCampaignDeliverables(campaignId || ''),
    enabled: Boolean(campaignId),
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

export function useApplyToCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applyToCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
