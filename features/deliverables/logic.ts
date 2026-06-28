import type { Deliverable } from '@/features/core/types'

// A deliverable that the brand has approved but the creator still needs to post on
// TikTok and paste the link for — an actionable state that otherwise hides in
// History behind a passive "Approved" pill. Mirrors deliverableStage()'s
// 'submit_link' branch in app/campaigns/[id].tsx. Pure (no I/O) so it can be
// unit-tested and reused by the badge counts and the "Ready to post" CTA.
export function isAwaitingLink(
  d: Pick<Deliverable, 'url' | 'status' | 'approvalStatus' | 'readyForPosting'>
): boolean {
  const hasUrl = !!d.url && /^https?:\/\//i.test(d.url)
  if (hasUrl) return false
  if (d.status === 'pending' || d.status === 'revision_requested' || d.status === 'flagged' || d.status === 'published') {
    return false
  }
  if (d.approvalStatus === 'rejected') return false
  return d.approvalStatus === 'approved' || d.status === 'approved' || d.readyForPosting === true
}
