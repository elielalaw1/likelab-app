import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { applyToCampaign, getCampaignById, getCampaignDeliverables, getCampaigns } from '@/features/campaigns/api'
import { supabase } from '@/lib/supabase'

const queryPerf = {
  staleTime: 6 * 60 * 60 * 1000,
  gcTime: 8 * 60 * 60 * 1000,
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
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['campaigns', campaignId],
    queryFn: () => getCampaignById(campaignId || ''),
    enabled: Boolean(campaignId),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: (previous) => previous,
  })

  // Live phase/lifecycle updates: refetch this campaign (and the list) when the
  // backend mutates the row. Read-only — we never write campaigns from the app.
  useEffect(() => {
    if (!campaignId) return

    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] })
          queryClient.invalidateQueries({ queryKey: ['campaigns'] })
          queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign', campaignId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, queryClient])

  return query
}

export function useCampaignDeliverables(campaignId?: string) {
  return useQuery({
    queryKey: ['deliverables', 'campaign', campaignId],
    queryFn: () => getCampaignDeliverables(campaignId || ''),
    enabled: Boolean(campaignId),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    placeholderData: (previous) => previous,
  })
}

type CampaignRow = { id: string; creatorApplicationStatus?: string | null }

export function useApplyToCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applyToCampaign,
    // Flip the campaign to "applied" immediately so the CTA / card reflects the tap
    // before the round-trip completes. onError restores; onSettled reconciles.
    onMutate: async (campaignId: string) => {
      await queryClient.cancelQueries({ queryKey: ['campaigns'] })
      const prevList = queryClient.getQueryData<CampaignRow[]>(['campaigns'])
      const prevDetail = queryClient.getQueryData<CampaignRow>(['campaigns', campaignId])

      if (prevList) {
        queryClient.setQueryData<CampaignRow[]>(
          ['campaigns'],
          prevList.map((c) => (c.id === campaignId ? { ...c, creatorApplicationStatus: 'applied' } : c))
        )
      }
      if (prevDetail) {
        queryClient.setQueryData<CampaignRow>(['campaigns', campaignId], {
          ...prevDetail,
          creatorApplicationStatus: 'applied',
        })
      }
      return { prevList, prevDetail, campaignId }
    },
    onError: (_err, campaignId, context) => {
      if (context?.prevList) queryClient.setQueryData(['campaigns'], context.prevList)
      if (context?.prevDetail) queryClient.setQueryData(['campaigns', campaignId], context.prevDetail)
    },
    onSettled: (_data, _err, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignId] })
    },
  })
}
