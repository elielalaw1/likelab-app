import { palette } from '@/features/core/theme'
import type { CampaignPhase } from '@/features/core/types'

/** Short uppercase-friendly labels for the phase pill. */
export const PHASE_LABELS: Record<CampaignPhase, string> = {
  brief_upload: 'Brief Upload',
  application_period: 'Application Period',
  creator_selection: 'Creator Selection',
  product_sendout: 'Product Sendout',
  filming_period: 'Filming Period',
  video_selection: 'Video Selection',
  posting: 'Posting',
}

/** One-line creator-facing hint per phase (English, no emojis). */
export const PHASE_HINTS: Record<CampaignPhase, string> = {
  brief_upload: 'The brand is finalizing the brief.',
  application_period: 'Applications are open — apply now.',
  creator_selection: 'The brand is reviewing applications.',
  product_sendout: "You're in! The brand is sending out your product.",
  filming_period: 'Product on the way (or arrived). Start filming!',
  video_selection: 'The brand is reviewing submitted videos.',
  posting: 'Approved videos are scheduled to go live.',
}

// Per-phase chip colours mirroring the web platform's palette
// (src/lib/campaignPhase.ts): grey · blue · violet · pink · amber · orange · green.
const PHASE_COLORS: Record<CampaignPhase, { bg: string; text: string }> = {
  brief_upload: { bg: palette.neutralBg, text: palette.neutralText },    // grey
  application_period: { bg: '#DBEAFE', text: '#1D4ED8' },                // blue
  creator_selection: { bg: '#EDE9FE', text: '#6D28D9' },                 // violet
  product_sendout: { bg: '#FCE7F3', text: '#BE185D' },                   // pink
  filming_period: { bg: palette.warningBg, text: palette.warningText },  // amber
  video_selection: { bg: '#FFEDD5', text: '#C2410C' },                   // orange
  posting: { bg: palette.successBg, text: palette.successText },         // green
}

/** Phase colours matching the web platform's per-phase palette. */
export function phaseColors(phase: CampaignPhase): { bg: string; text: string } {
  return PHASE_COLORS[phase] ?? { bg: palette.neutralBg, text: palette.neutralText }
}

/**
 * Per-deliverable approval chip, only surfaced while the parent campaign is in
 * 'video_selection' or 'posting'. Returns null otherwise.
 */
export function approvalChip(
  phase: CampaignPhase | null | undefined,
  approvalStatus: 'pending' | 'approved' | 'rejected' | undefined,
  readyForPosting: boolean | undefined,
): { label: string; bg: string; text: string } | null {
  if (phase !== 'video_selection' && phase !== 'posting') return null

  if (phase === 'posting' && readyForPosting === true) {
    return { label: 'Scheduled to post', bg: palette.successBg, text: palette.successText }
  }

  switch (approvalStatus || 'pending') {
    case 'approved':
      return { label: 'Approved', bg: palette.successBg, text: palette.successText }
    case 'rejected':
      return { label: 'Changes needed', bg: palette.dangerBg, text: palette.dangerText }
    default:
      return { label: 'Pending review', bg: palette.neutralBg, text: palette.neutralText }
  }
}
