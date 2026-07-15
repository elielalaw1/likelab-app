import { redesign } from '@/features/core/theme'

// Creator tier / status ladder — a motivational progression shown inside the app.
// Tier is computed CLIENT-SIDE from data already on the device.
//
// Progression axis = deliverables the creator has COMPLETED (approved/published).
// This deliberately rewards finishing good WORK, not applying — an applications-
// based ladder trained creators to spam applications for status. Standing earned
// here is non-monetary and non-zero-sum: it's the creator's track record, the
// thing that gives them a reason to keep performing between campaigns. Completing
// the first deliverable lifts them off "Newcomer" into Rookie — an early, visible
// reward. See features/profile/reputation.ts for the richer signal breakdown that
// shares this same "completed deliverable" definition. Pure + render-free so
// thresholds stay unit-testable (see __tests__/tiers.test.ts).

export type TierId =
  | 'newcomer'
  | 'rookie'
  | 'rising'
  | 'contender'
  | 'established'
  | 'seasoned'
  | 'pro'
  | 'professional'
  | 'elite'
  | 'legend'

export type Tier = {
  id: TierId
  // 1-based position on the ladder (1 = Newcomer … 10 = Legend).
  level: number
  // Full badge label, e.g. "Professional creator".
  label: string
  // Short name for tight spots (chips/meters), e.g. "Pro".
  short: string
  // Solid accent for text/icon.
  color: string
  // Avatar-ring / badge gradient (≥2 stops) — escalates in prestige.
  ring: readonly [string, string, ...string[]]
  // MaterialCommunityIcons glyph name for the emblem (cast in the UI layer to
  // keep this file free of renderer imports).
  emblem: string
  // Minimum completed deliverables required to reach this tier (inclusive).
  minCompleted: number
}

// Ascending ladder. Level 1 (Newcomer) is the pre-completion default; level 2
// (Rookie) is earned by the first completed deliverable; Legend is the
// holographic capstone. Thresholds are scaled for completed WORK (much scarcer
// than applications), so the early levels come quickly and the top is a grind.
export const TIERS: readonly Tier[] = [
  { id: 'newcomer',     level: 1,  label: 'Newcomer',              short: 'New',      color: '#9AA0AD', ring: ['#CBD0D8', '#9AA0AD'],                     emblem: 'sprout-outline',   minCompleted: 0 },
  { id: 'rookie',       level: 2,  label: 'Rookie creator',        short: 'Rookie',   color: '#4FA86B', ring: ['#8FD6A6', '#4FA86B'],                     emblem: 'sprout',           minCompleted: 1 },
  { id: 'rising',       level: 3,  label: 'Rising creator',        short: 'Rising',   color: '#1FC8E8', ring: ['#7FE3F3', '#1FC8E8'],                     emblem: 'trending-up',      minCompleted: 2 },
  { id: 'contender',    level: 4,  label: 'Contender creator',     short: 'Contender',color: '#F2994A', ring: ['#FFC78A', '#F2994A'],                     emblem: 'fire',             minCompleted: 4 },
  { id: 'established',  level: 5,  label: 'Established creator',    short: 'Estab.',   color: '#5B8DEF', ring: ['#9DBCFF', '#5B8DEF'],                     emblem: 'star-four-points', minCompleted: 6 },
  { id: 'seasoned',     level: 6,  label: 'Seasoned creator',      short: 'Seasoned', color: '#B0764A', ring: ['#E4B483', '#B0764A'],                     emblem: 'shield-star',      minCompleted: 9 },
  { id: 'pro',          level: 7,  label: 'Pro creator',           short: 'Pro',      color: '#8A9099', ring: ['#DBE0E8', '#9AA0AD'],                     emblem: 'medal',            minCompleted: 13 },
  { id: 'professional', level: 8,  label: 'Professional creator',  short: 'Pro+',     color: '#D9A21B', ring: ['#FFE39A', '#F2A93C'],                     emblem: 'trophy',           minCompleted: 18 },
  { id: 'elite',        level: 9,  label: 'Elite creator',         short: 'Elite',    color: redesign.color.purple, ring: [redesign.color.purple, redesign.color.purple], emblem: 'crown',            minCompleted: 25 },
  { id: 'legend',       level: 10, label: 'Legend creator',        short: 'Legend',   color: redesign.color.gold,   ring: [redesign.color.gold, redesign.color.gold],     emblem: 'diamond-stone',    minCompleted: 35 },
] as const

// XP required to reach each level (index 0 = L1 … index 9 = L10). Mirrors the
// backend `public.level_for_xp` ladder so the client can draw progress toward the
// next level. The backend is the source of truth for `level`; these thresholds
// only drive the local progress bar.
export const XP_THRESHOLDS = [0, 50, 150, 350, 700, 1200, 2000, 3200, 5000, 8000] as const

export type TierProgress = {
  tier: Tier
  // The tier above the current one, or null at the top of the ladder.
  next: Tier | null
  // XP accumulated within the CURRENT level band (>= 0).
  current: number
  // XP span of the current band → next level, or null at the top.
  target: number | null
  // XP still needed to reach the next level (0 at top).
  remaining: number
  // Fill ratio of the current band, 0..1 (1 at top).
  fraction: number
  // Total account XP + the resolved level (1..10), from the backend.
  xp: number
  level: number
}

// Builds tier + progress from the creator's REAL account XP/level (from the backend
// `creator_levels` view). `level` is authoritative; `xp` drives the bar. Defensive
// against junk input.
export function computeLevelProgress(xp: number, level: number): TierProgress {
  const x = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0
  const lvl = Number.isFinite(level) ? Math.min(TIERS.length, Math.max(1, Math.floor(level))) : 1
  const tier = TIERS[lvl - 1]
  const next = lvl < TIERS.length ? TIERS[lvl] : null

  if (!next) {
    return { tier, next: null, current: x - XP_THRESHOLDS[lvl - 1], target: null, remaining: 0, fraction: 1, xp: x, level: lvl }
  }

  const base = XP_THRESHOLDS[lvl - 1]
  const span = XP_THRESHOLDS[lvl] - base
  const into = Math.max(0, x - base)
  const fraction = span > 0 ? Math.min(1, Math.max(0, into / span)) : 0
  const remaining = Math.max(0, XP_THRESHOLDS[lvl] - x)

  return { tier, next, current: into, target: span, remaining, fraction, xp: x, level: lvl }
}

export type TierLadderEntry = {
  tier: Tier
  // The creator has met this tier's threshold.
  achieved: boolean
  // This is the creator's current tier.
  current: boolean
  // This is the very next tier to unlock.
  isNext: boolean
}

// The full ladder annotated with the creator's progress — for the "Creator
// levels" screen where every tier and its requirement is listed.
export function getTierLadder(level: number): TierLadderEntry[] {
  const lvl = Number.isFinite(level) ? Math.min(TIERS.length, Math.max(1, Math.floor(level))) : 1
  return TIERS.map((tier) => ({
    tier,
    achieved: tier.level <= lvl,
    current: tier.level === lvl,
    isNext: tier.level === lvl + 1,
  }))
}
