import { Campaign } from '@/features/core/types'

export function campaignRouteParams(campaign: Pick<Campaign, 'id' | 'creatorApplicationStatus'>) {
  return {
    pathname: '/campaigns/[id]' as const,
    params: campaign.creatorApplicationStatus === 'accepted' ? { id: campaign.id, tab: 'videos' } : { id: campaign.id },
  }
}
