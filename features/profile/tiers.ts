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
  { id: 'elite',        level: 9,  label: 'Elite creator',         short: 'Elite',    color: '#F25CC1', ring: ['#7A3FF2', '#F25CC1'],                     emblem: 'crown',            minCompleted: 25 },
  { id: 'legend',       level: 10, label: 'Legend creator',        short: 'Legend',   color: '#7A3FF2', ring: ['#F5C73C', '#F25CC1', '#7A3FF2', '#1FC8E8'], emblem: 'diamond-stone',    minCompleted: 35 },
] as const

export type TierInput = {
  // Number of deliverables the creator has completed (approved/published).
  completedDeliverables: number
}

export type TierProgress = {
  tier: Tier
  // The tier above the current one, or null at the top of the ladder.
  next: Tier | null
  // Completed deliverables accumulated within the CURRENT tier band (>= 0).
  current: number
  // Completed deliverables spanning the current band → next threshold, or null at top.
  target: number | null
  // Completed deliverables still required to level up (0 at top).
  remaining: number
  // Fill ratio of the current tier band, 0..1 (1 at top).
  fraction: number
  // Total completed deliverables counted (normalised, never negative).
  completedDeliverables: number
}

// Resolves the current tier + progress toward the next one from how many
// deliverables the creator has completed. Defensive against junk input.
export function computeTier(input: TierInput): TierProgress {
  const completed = Number.isFinite(input.completedDeliverables) ? Math.max(0, Math.floor(input.completedDeliverables)) : 0

  // Highest tier whose threshold the creator has met.
  let index = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (completed >= TIERS[i].minCompleted) index = i
  }
  const tier = TIERS[index]
  const next = index < TIERS.length - 1 ? TIERS[index + 1] : null

  if (!next) {
    return { tier, next: null, current: completed - tier.minCompleted, target: null, remaining: 0, fraction: 1, completedDeliverables: completed }
  }

  const span = next.minCompleted - tier.minCompleted
  const into = completed - tier.minCompleted
  const fraction = span > 0 ? Math.min(1, Math.max(0, into / span)) : 0
  const remaining = Math.max(0, next.minCompleted - completed)

  return { tier, next, current: into, target: span, remaining, fraction, completedDeliverables: completed }
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
export function getTierLadder(completedDeliverables: number): TierLadderEntry[] {
  const { tier: currentTier, next } = computeTier({ completedDeliverables })
  const completed = Number.isFinite(completedDeliverables) ? Math.max(0, Math.floor(completedDeliverables)) : 0
  return TIERS.map((tier) => ({
    tier,
    achieved: completed >= tier.minCompleted,
    current: tier.id === currentTier.id,
    isNext: next != null && tier.id === next.id,
  }))
}
