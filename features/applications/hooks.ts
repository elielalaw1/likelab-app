import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptInvitation, declineInvitation, getApplications } from '@/features/applications/api'
import type { CreatorApplication, CreatorInvitation } from '@/features/core/types'

const queryPerf = {
  staleTime: 2 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
}

type ApplicationsData = { applications: CreatorApplication[]; invitations: CreatorInvitation[] }

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: getApplications,
    ...queryPerf,
    placeholderData: (previous) => previous,
  })
}

// Optimistically flip the invitation's status so the Accept/Decline buttons vanish
// the instant the user taps — even on a slow connection. Realtime + the onSettled
// refetch reconcile with the real server state (and add the accepted application row).
function useInvitationStatusMutation(
  mutationFn: (invitationId: string) => Promise<void>,
  nextStatus: CreatorInvitation['status']
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async (invitationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['applications'] })
      const previous = queryClient.getQueryData<ApplicationsData>(['applications'])
      if (previous) {
        queryClient.setQueryData<ApplicationsData>(['applications'], {
          ...previous,
          invitations: previous.invitations.map((inv) =>
            inv.id === invitationId ? { ...inv, status: nextStatus } : inv
          ),
        })
      }
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['applications'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useAcceptInvitation() {
  return useInvitationStatusMutation(acceptInvitation, 'accepted')
}

export function useDeclineInvitation() {
  return useInvitationStatusMutation(declineInvitation, 'declined')
}
