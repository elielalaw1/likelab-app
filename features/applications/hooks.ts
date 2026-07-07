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
        const invitation = previous.invitations.find((inv) => inv.id === invitationId)
        // On accept, immediately add a placeholder accepted application so an
        // "Accepted campaign" card replaces the invitation instead of the card
        // vanishing until the server row arrives. The deterministic optimistic id
        // can't collide with the real server row, and onError rollback removes it.
        const applications =
          nextStatus === 'accepted' && invitation
            ? [
                {
                  id: `optimistic-${invitationId}`,
                  campaignId: invitation.campaignId,
                  campaignTitle: invitation.campaignTitle,
                  campaignImageUrl: invitation.campaignImageUrl,
                  campaignBrandName: invitation.campaignBrandName,
                  status: 'accepted' as const,
                  rewardAmount: invitation.rewardAmount,
                  rewardType: invitation.rewardType,
                  startDate: invitation.startDate,
                  endDate: invitation.endDate,
                  createdAt: invitation.createdAt,
                } satisfies CreatorApplication,
                ...previous.applications,
              ]
            : previous.applications
        queryClient.setQueryData<ApplicationsData>(['applications'], {
          ...previous,
          applications,
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
      // Accepting creates the campaign's deliverables server-side — refresh the
      // Projects tab too (it has refetchOnMount:false, so nothing else pulls it in).
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
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
