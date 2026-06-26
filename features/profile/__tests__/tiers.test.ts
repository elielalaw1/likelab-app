import { computeTier, getTierLadder, TIERS } from '@/features/profile/tiers'

describe('computeTier — ladder thresholds', () => {
  it('starts at Newcomer before applying to anything', () => {
    const t = computeTier({ appliedCampaigns: 0 })
    expect(t.tier.id).toBe('newcomer')
    expect(t.tier.level).toBe(1)
    expect(t.next?.id).toBe('rookie')
  })

  it('lifts the creator to Rookie on their first application', () => {
    const t = computeTier({ appliedCampaigns: 1 })
    expect(t.tier.id).toBe('rookie')
    expect(t.tier.level).toBe(2)
  })

  it('climbs through the mid ladder at the right counts', () => {
    expect(computeTier({ appliedCampaigns: 2 }).tier.id).toBe('rookie')
    expect(computeTier({ appliedCampaigns: 3 }).tier.id).toBe('rising')
    expect(computeTier({ appliedCampaigns: 6 }).tier.id).toBe('contender')
    expect(computeTier({ appliedCampaigns: 10 }).tier.id).toBe('established')
    expect(computeTier({ appliedCampaigns: 22 }).tier.id).toBe('pro')
    expect(computeTier({ appliedCampaigns: 32 }).tier.id).toBe('professional')
  })

  it('reaches Legend at the top and stays there', () => {
    expect(computeTier({ appliedCampaigns: 60 }).tier.id).toBe('legend')
    expect(computeTier({ appliedCampaigns: 500 }).tier.id).toBe('legend')
    expect(computeTier({ appliedCampaigns: 500 }).next).toBeNull()
  })

})

describe('computeTier — progress to next tier', () => {
  it('reports applications remaining and a 0..1 fill within the band', () => {
    // Rising band is 3..5 (next = Contender at 6): 4 applications = 1 of 3 into the band.
    const t = computeTier({ appliedCampaigns: 4 })
    expect(t.tier.id).toBe('rising')
    expect(t.target).toBe(3) // 6 - 3
    expect(t.current).toBe(1) // 4 - 3
    expect(t.remaining).toBe(2) // 6 - 4
    expect(t.fraction).toBeCloseTo(1 / 3)
  })

  it('caps progress at the top tier', () => {
    const t = computeTier({ appliedCampaigns: 80 })
    expect(t.tier.id).toBe('legend')
    expect(t.target).toBeNull()
    expect(t.remaining).toBe(0)
    expect(t.fraction).toBe(1)
  })
})

describe('computeTier — defensive input', () => {
  it('clamps negative and fractional counts', () => {
    expect(computeTier({ appliedCampaigns: -5 }).tier.id).toBe('newcomer')
    expect(computeTier({ appliedCampaigns: 1.9 }).tier.id).toBe('rookie')
    expect(computeTier({ appliedCampaigns: 1.9 }).appliedCampaigns).toBe(1)
  })

  it('treats non-finite input as zero (falls back to Newcomer)', () => {
    expect(computeTier({ appliedCampaigns: NaN }).tier.id).toBe('newcomer')
    expect(computeTier({ appliedCampaigns: Infinity }).appliedCampaigns).toBe(0)
  })

  it('keeps the ladder sorted ascending and 10 levels deep', () => {
    expect(TIERS).toHaveLength(10)
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minApplications).toBeGreaterThan(TIERS[i - 1].minApplications)
      expect(TIERS[i].level).toBe(TIERS[i - 1].level + 1)
    }
  })
})

describe('getTierLadder', () => {
  it('returns every tier annotated with the creator’s progress', () => {
    const ladder = getTierLadder(4) // Rising creator, next = Contender
    expect(ladder).toHaveLength(10)

    const current = ladder.filter((e) => e.current)
    expect(current).toHaveLength(1)
    expect(current[0].tier.id).toBe('rising')

    const next = ladder.filter((e) => e.isNext)
    expect(next).toHaveLength(1)
    expect(next[0].tier.id).toBe('contender')

    // Newcomer, Rookie, Rising are achieved at 4 applications; the rest are locked.
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.id)).toEqual(['newcomer', 'rookie', 'rising'])
  })

  it('marks only Newcomer as achieved before applying', () => {
    const ladder = getTierLadder(0)
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.id)).toEqual(['newcomer'])
    expect(ladder.find((e) => e.current)?.tier.id).toBe('newcomer')
    expect(ladder.find((e) => e.isNext)?.tier.id).toBe('rookie')
  })
})
