import { computeTier, getTierLadder, TIERS } from '@/features/profile/tiers'

describe('computeTier — ladder thresholds', () => {
  it('starts at Newcomer before completing anything', () => {
    const t = computeTier({ completedDeliverables: 0 })
    expect(t.tier.id).toBe('newcomer')
    expect(t.tier.level).toBe(1)
    expect(t.next?.id).toBe('rookie')
  })

  it('lifts the creator to Rookie on their first completed deliverable', () => {
    const t = computeTier({ completedDeliverables: 1 })
    expect(t.tier.id).toBe('rookie')
    expect(t.tier.level).toBe(2)
  })

  it('climbs through the mid ladder at the right counts', () => {
    expect(computeTier({ completedDeliverables: 1 }).tier.id).toBe('rookie')
    expect(computeTier({ completedDeliverables: 2 }).tier.id).toBe('rising')
    expect(computeTier({ completedDeliverables: 4 }).tier.id).toBe('contender')
    expect(computeTier({ completedDeliverables: 6 }).tier.id).toBe('established')
    expect(computeTier({ completedDeliverables: 13 }).tier.id).toBe('pro')
    expect(computeTier({ completedDeliverables: 18 }).tier.id).toBe('professional')
  })

  it('reaches Legend at the top and stays there', () => {
    expect(computeTier({ completedDeliverables: 35 }).tier.id).toBe('legend')
    expect(computeTier({ completedDeliverables: 500 }).tier.id).toBe('legend')
    expect(computeTier({ completedDeliverables: 500 }).next).toBeNull()
  })
})

describe('computeTier — progress to next tier', () => {
  it('reports deliverables remaining and a 0..1 fill within the band', () => {
    // Contender band is 4..5 (next = Established at 6): 5 completed = 1 of 2 into the band.
    const t = computeTier({ completedDeliverables: 5 })
    expect(t.tier.id).toBe('contender')
    expect(t.target).toBe(2) // 6 - 4
    expect(t.current).toBe(1) // 5 - 4
    expect(t.remaining).toBe(1) // 6 - 5
    expect(t.fraction).toBeCloseTo(1 / 2)
  })

  it('caps progress at the top tier', () => {
    const t = computeTier({ completedDeliverables: 80 })
    expect(t.tier.id).toBe('legend')
    expect(t.target).toBeNull()
    expect(t.remaining).toBe(0)
    expect(t.fraction).toBe(1)
  })
})

describe('computeTier — defensive input', () => {
  it('clamps negative and fractional counts', () => {
    expect(computeTier({ completedDeliverables: -5 }).tier.id).toBe('newcomer')
    expect(computeTier({ completedDeliverables: 1.9 }).tier.id).toBe('rookie')
    expect(computeTier({ completedDeliverables: 1.9 }).completedDeliverables).toBe(1)
  })

  it('treats non-finite input as zero (falls back to Newcomer)', () => {
    expect(computeTier({ completedDeliverables: NaN }).tier.id).toBe('newcomer')
    expect(computeTier({ completedDeliverables: Infinity }).completedDeliverables).toBe(0)
  })

  it('keeps the ladder sorted ascending and 10 levels deep', () => {
    expect(TIERS).toHaveLength(10)
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].minCompleted).toBeGreaterThan(TIERS[i - 1].minCompleted)
      expect(TIERS[i].level).toBe(TIERS[i - 1].level + 1)
    }
  })
})

describe('getTierLadder', () => {
  it('returns every tier annotated with the creator’s progress', () => {
    const ladder = getTierLadder(2) // Rising creator, next = Contender
    expect(ladder).toHaveLength(10)

    const current = ladder.filter((e) => e.current)
    expect(current).toHaveLength(1)
    expect(current[0].tier.id).toBe('rising')

    const next = ladder.filter((e) => e.isNext)
    expect(next).toHaveLength(1)
    expect(next[0].tier.id).toBe('contender')

    // Newcomer, Rookie, Rising are achieved at 2 completed deliverables; the rest are locked.
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.id)).toEqual(['newcomer', 'rookie', 'rising'])
  })

  it('marks only Newcomer as achieved before completing anything', () => {
    const ladder = getTierLadder(0)
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.id)).toEqual(['newcomer'])
    expect(ladder.find((e) => e.current)?.tier.id).toBe('newcomer')
    expect(ladder.find((e) => e.isNext)?.tier.id).toBe('rookie')
  })
})
