// Creator tier / status ladder — a purely cosmetic, motivational progression
// shown inside the app. No backend gating: tier is computed CLIENT-SIDE from
// data already on the profile, and the "unlocks" (e.g. invite-only campaigns)
// are aspirational flavour to drive engagement, not enforced access control.
//
// Progression axis = campaigns the creator has APPLIED to (engagement). Applying
// to the very first campaign lifts them off "Newcomer" into Rookie — an early,
// visible reward. Pure + render-free so thresholds stay unit-testable
// (see __tests__/tiers.test.ts).

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
  // Minimum campaigns applied-to required to reach this tier (inclusive).
  minApplications: number
}

// Ascending ladder. Level 1 (Newcomer) is the pre-application default; level 2
// (Rookie) is earned by the first application; Legend is the holographic capstone.
export const TIERS: readonly Tier[] = [
  { id: 'newcomer',     level: 1,  label: 'Newcomer',              short: 'New',      color: '#9AA0AD', ring: ['#CBD0D8', '#9AA0AD'],                     emblem: 'sprout-outline',   minApplications: 0 },
  { id: 'rookie',       level: 2,  label: 'Rookie creator',        short: 'Rookie',   color: '#4FA86B', ring: ['#8FD6A6', '#4FA86B'],                     emblem: 'sprout',           minApplications: 1 },
  { id: 'rising',       level: 3,  label: 'Rising creator',        short: 'Rising',   color: '#1FC8E8', ring: ['#7FE3F3', '#1FC8E8'],                     emblem: 'trending-up',      minApplications: 3 },
  { id: 'contender',    level: 4,  label: 'Contender creator',     short: 'Contender',color: '#F2994A', ring: ['#FFC78A', '#F2994A'],                     emblem: 'fire',             minApplications: 6 },
  { id: 'established',  level: 5,  label: 'Established creator',    short: 'Estab.',   color: '#5B8DEF', ring: ['#9DBCFF', '#5B8DEF'],                     emblem: 'star-four-points', minApplications: 10 },
  { id: 'seasoned',     level: 6,  label: 'Seasoned creator',      short: 'Seasoned', color: '#B0764A', ring: ['#E4B483', '#B0764A'],                     emblem: 'shield-star',      minApplications: 15 },
  { id: 'pro',          level: 7,  label: 'Pro creator',           short: 'Pro',      color: '#8A9099', ring: ['#DBE0E8', '#9AA0AD'],                     emblem: 'medal',            minApplications: 22 },
  { id: 'professional', level: 8,  label: 'Professional creator',  short: 'Pro+',     color: '#D9A21B', ring: ['#FFE39A', '#F2A93C'],                     emblem: 'trophy',           minApplications: 32 },
  { id: 'elite',        level: 9,  label: 'Elite creator',         short: 'Elite',    color: '#F25CC1', ring: ['#7A3FF2', '#F25CC1'],                     emblem: 'crown',            minApplications: 45 },
  { id: 'legend',       level: 10, label: 'Legend creator',        short: 'Legend',   color: '#7A3FF2', ring: ['#F5C73C', '#F25CC1', '#7A3FF2', '#1FC8E8'], emblem: 'diamond-stone',    minApplications: 60 },
] as const

export type TierInput = {
  // Number of campaigns the creator has applied to (any status).
  appliedCampaigns: number
}

export type TierProgress = {
  tier: Tier
  // The tier above the current one, or null at the top of the ladder.
  next: Tier | null
  // Applications accumulated within the CURRENT tier band (>= 0).
  current: number
  // Applications spanning the current band → next threshold, or null at top.
  target: number | null
  // Applications still required to level up (0 at top).
  remaining: number
  // Fill ratio of the current tier band, 0..1 (1 at top).
  fraction: number
  // Total applications counted (normalised, never negative).
  appliedCampaigns: number
}

// Resolves the current tier + progress toward the next one from how many
// campaigns the creator has applied to. Defensive against junk input.
export function computeTier(input: TierInput): TierProgress {
  const applied = Number.isFinite(input.appliedCampaigns) ? Math.max(0, Math.floor(input.appliedCampaigns)) : 0

  // Highest tier whose threshold the creator has met.
  let index = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (applied >= TIERS[i].minApplications) index = i
  }
  const tier = TIERS[index]
  const next = index < TIERS.length - 1 ? TIERS[index + 1] : null

  if (!next) {
    return { tier, next: null, current: applied - tier.minApplications, target: null, remaining: 0, fraction: 1, appliedCampaigns: applied }
  }

  const span = next.minApplications - tier.minApplications
  const into = applied - tier.minApplications
  const fraction = span > 0 ? Math.min(1, Math.max(0, into / span)) : 0
  const remaining = Math.max(0, next.minApplications - applied)

  return { tier, next, current: into, target: span, remaining, fraction, appliedCampaigns: applied }
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
export function getTierLadder(appliedCampaigns: number): TierLadderEntry[] {
  const { tier: currentTier, next } = computeTier({ appliedCampaigns })
  const applied = Number.isFinite(appliedCampaigns) ? Math.max(0, Math.floor(appliedCampaigns)) : 0
  return TIERS.map((tier) => ({
    tier,
    achieved: applied >= tier.minApplications,
    current: tier.id === currentTier.id,
    isNext: next != null && tier.id === next.id,
  }))
}
