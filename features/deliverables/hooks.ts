import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDeliverables, submitDeliverableUrl } from '@/features/deliverables/api'

const queryPerf = {
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
}

export function useDeliverables() {
  return useQuery({
    queryKey: ['deliverables'],
    queryFn: getDeliverables,
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

export function useSubmitDeliverable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitDeliverableUrl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
    },
  })
}
