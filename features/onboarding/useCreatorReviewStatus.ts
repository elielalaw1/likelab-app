import { CreatorProfile } from '@/features/core/types'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'unknown'

export function getCreatorReviewStatus(profile?: CreatorProfile | null): ReviewStatus {
  const status = (profile?.reviewStatus || '').toLowerCase().trim()
  if (status === 'pending' || status === 'approved' || status === 'rejected') return status
  return 'unknown'
}

