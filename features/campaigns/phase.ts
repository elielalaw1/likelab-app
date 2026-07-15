import { palette } from '@/features/core/theme'
import type { ApplicationStatus, CampaignPhase } from '@/features/core/types'

const PHASE_ORDER: CampaignPhase[] = [
  'brief_upload',
  'application_period',
  'creator_selection',
  'product_sendout',
  'filming_period',
  'video_selection',
  'posting',
]
function phaseIndex(phase: CampaignPhase | null | undefined): number {
  return phase ? PHASE_ORDER.indexOf(phase) : -1
}

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

// Phases during which process-video-upload accepts a raw video — must match
// ALLOWED_UPLOAD_PHASES in supabase/functions/process-video-upload/index.ts
// exactly (confirmed 2026-07: the backend uses one list for both a first upload
// and a revision, no separate gate for either). Used to proactively block the
// upload button with a clear explainer instead of letting the attempt fail
// server-side with a bare "phase_locked" error after the creator already picked
// + compressed a file.
export const VIDEO_UPLOAD_ALLOWED_PHASES: CampaignPhase[] = ['filming_period', 'video_selection', 'posting']
export const VIDEO_REVISION_ALLOWED_PHASES: CampaignPhase[] = VIDEO_UPLOAD_ALLOWED_PHASES

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

export type CreatorActionKind = 'await_selection' | 'not_selected' | 'await_product'

export type CreatorAction = {
  kind: CreatorActionKind
  title: string
  body: string
}

// Matches formatDateRange's UTC formatting (features/core/format.ts) — a
// date-only "YYYY-MM-DD" parses as UTC midnight, so local formatting would show
// the day before for anyone west of UTC.
function formatArrivalDate(value: string): string | null {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/**
 * The one "what to do now" message for every PRE-deliverable state — not yet
 * applied is left to the existing Apply CTA (returns null there, nothing to add).
 * Once an accepted creator has a deliverable to work on (filming_period+), defer to
 * `resolveStage`/`STAGE_UI` (features/deliverables/stage.ts) instead — that's the
 * established "one clear next step" system for upload/review/post, and this
 * function doesn't reimplement it.
 */
export function getCreatorAction(
  phase: CampaignPhase | null | undefined,
  applicationStatus: ApplicationStatus | null | undefined,
  hasDeliverables: boolean,
  productArrivalDate?: string | null,
): CreatorAction | null {
  if (applicationStatus === 'accepted' && hasDeliverables) return null

  const idx = phaseIndex(phase)
  const sendoutIdx = phaseIndex('product_sendout')
  const wasInTheRunning = applicationStatus === 'applied' || applicationStatus === 'rejected'

  // Rejected outright, or the campaign moved past selection without accepting them —
  // either way there's nothing left to wait for on this campaign.
  if (wasInTheRunning && (applicationStatus === 'rejected' || (sendoutIdx >= 0 && idx >= sendoutIdx))) {
    return {
      kind: 'not_selected',
      title: 'Not selected this time',
      body: 'The brand went with other creators for this one. Check Discover for other open campaigns — there’s always something new.',
    }
  }

  if (applicationStatus === 'applied' && sendoutIdx >= 0 && idx >= 0 && idx < sendoutIdx) {
    // Title deliberately doesn't repeat "Application sent" — the sticky Apply
    // button already shows that as its (disabled) label; this card's job is to
    // say what happens next, not restate the same status a second time.
    return {
      kind: 'await_selection',
      title: 'Under review',
      body: 'The brand is reviewing applications. You’ll hear back once they’ve made their picks.',
    }
  }

  if (applicationStatus === 'accepted' && phase === 'product_sendout') {
    const arrival = productArrivalDate ? formatArrivalDate(productArrivalDate) : null
    return {
      kind: 'await_product',
      title: 'You’re in!',
      body: arrival
        ? `The brand is sending out your product — expect it around ${arrival}. Didn’t get it by then? Contact support.`
        : PHASE_HINTS.product_sendout,
    }
  }

  return null
}

/**
 * Should this campaign be filtered out of list/browse surfaces (Discover, etc.)
 * entirely for this creator? Distinct from getCreatorAction's 'not_selected' card,
 * which still shows on the campaign's own detail page (so a passed-over creator
 * gets a clear "not selected" message instead of a 404) — this only governs
 * whether the campaign appears in a list at all.
 */
export function isCampaignHiddenFromList(
  phase: CampaignPhase | null | undefined,
  applicationStatus: ApplicationStatus | null | undefined,
): boolean {
  // Brief still being written — not public yet.
  if (phase === 'brief_upload') return true

  const idx = phaseIndex(phase)
  const sendoutIdx = phaseIndex('product_sendout')
  const applied = applicationStatus === 'applied' || applicationStatus === 'accepted'

  // Never applied and applications have already closed (or the campaign moved on
  // without them) — too late, nothing to do here.
  if (!applied && idx >= 0 && phase !== 'application_period') return true

  // Not accepted, and the campaign has moved on to sendout+ — they weren't
  // selected; the detail page still explains this, but it drops off lists.
  if (applicationStatus !== 'accepted' && sendoutIdx >= 0 && idx >= sendoutIdx) return true

  return false
}
