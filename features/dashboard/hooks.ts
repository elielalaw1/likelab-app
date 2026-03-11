import { useQuery } from '@tanstack/react-query'
import { getAcceptedApplicationCampaigns, getRecentApplications } from '@/features/applications/api'
import { getCreatorProfile } from '@/features/profile/api'

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const [profile, activeCampaigns, recentApplications] = await Promise.all([
        getCreatorProfile(),
        getAcceptedApplicationCampaigns(3),
        getRecentApplications(3),
      ])

      return {
        profile,
        activeCampaigns,
        recentApplications,
      }
    },
  })
}
