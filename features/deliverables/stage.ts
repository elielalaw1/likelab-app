import type { MaterialCommunityIcons } from '@expo/vector-icons'
import type { Deliverable } from '@/features/core/types'

// Creator-facing step for one deliverable, matching the backend flow:
// upload video → brand review → (approved) post on TikTok + submit link → live.
export type DeliverableStage = 'deliver' | 'upload' | 'under_review' | 'revision' | 'submit_link' | 'live'

export function deliverableStage(d: Deliverable): DeliverableStage {
  // Brand change-requests take priority even if a link was already submitted.
  if (d.status === 'revision_requested' || d.status === 'flagged' || d.approvalStatus === 'rejected') return 'revision'
  if (d.url || d.status === 'published') return 'live'
  if (d.approvalStatus === 'approved' || d.status === 'approved' || d.readyForPosting) return 'submit_link'
  if (d.status === 'pending') return 'upload'
  return 'under_review'
}

// Tier-aware stage. Standard (no-review) campaigns collapse the upload → review → post
// sequence into a single "deliver" step (link + raw file) that goes straight to live.
// Gold/partner campaigns (requiresReview) keep the full review flow above.
export function resolveStage(d: Deliverable, requiresReview: boolean): DeliverableStage {
  if (requiresReview) return deliverableStage(d)
  if (d.url || d.status === 'published') return 'live'
  return 'deliver'
}

// One plain-language status + instruction per stage so a creator instantly knows
// what (if anything) to do. `ring`/`glow` carry the app's gradient design language
// onto each tile/card; `actionable` flags the stages that need the creator to act.
export const STAGE_UI: Record<
  DeliverableStage,
  {
    label: string
    color: string
    bg: string
    ring: readonly [string, string]
    glow: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    instruction: string
    actionable: boolean
  }
> = {
  deliver:      { label: 'Your turn',     color: '#6350B8', bg: 'rgba(99,80,184,0.12)', ring: ['#A78BFA', '#6350B8'], glow: 'rgba(99,80,184,0.20)', icon: 'send-outline',        instruction: 'Post it on TikTok, then submit the link and your raw file — it goes live right away.', actionable: true },
  upload:       { label: 'Your turn',     color: '#2563EB', bg: 'rgba(37,99,235,0.12)',  ring: ['#6BA5FF', '#2563EB'], glow: 'rgba(37,99,235,0.20)',  icon: 'tray-arrow-up',       instruction: 'Upload your video for the brand to review before you post it.', actionable: true },
  revision:     { label: 'Changes asked', color: '#EA580C', bg: 'rgba(234,88,12,0.12)',  ring: ['#FFB07A', '#EA580C'], glow: 'rgba(234,88,12,0.20)',  icon: 'pencil-outline',      instruction: 'The brand asked for changes — upload a new version.',           actionable: true },
  under_review: { label: 'In review',     color: '#6350B8', bg: 'rgba(99,80,184,0.12)', ring: ['#A78BFA', '#6350B8'], glow: 'rgba(99,80,184,0.18)', icon: 'clock-outline',       instruction: 'The brand is checking your video. Nothing to do right now.',     actionable: false },
  submit_link:  { label: 'Post it now',   color: '#0F9F6E', bg: 'rgba(16,159,110,0.12)', ring: ['#5FD6A6', '#0F9F6E'], glow: 'rgba(16,159,110,0.20)', icon: 'check-decagram',      instruction: 'Approved! Post it on TikTok, then paste the link here.',         actionable: true },
  live:         { label: 'Live',          color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', ring: ['#67D8F5', '#0EA5E9'], glow: 'rgba(14,165,233,0.18)', icon: 'star-circle-outline', instruction: 'This video is live — nice work.',                               actionable: false },
}
