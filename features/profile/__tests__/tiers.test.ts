import { computeLevelProgress, getTierLadder, XP_THRESHOLDS, TIERS } from '@/features/profile/tiers'

describe('computeLevelProgress', () => {
  it('maps the backend level to the tier and carries xp', () => {
    const p = computeLevelProgress(0, 1)
    expect(p.tier.id).toBe('newcomer')
    expect(p.level).toBe(1)
    expect(p.xp).toBe(0)
    expect(p.next?.level).toBe(2)
  })

  it('computes progress within the current level band', () => {
    // Level 2 band: 50..149 (next at 150). xp 100 = 50 into a 100-wide band.
    const p = computeLevelProgress(100, 2)
    expect(p.tier.level).toBe(2)
    expect(p.current).toBe(50) // 100 - 50
    expect(p.target).toBe(100) // 150 - 50
    expect(p.remaining).toBe(50) // 150 - 100
    expect(p.fraction).toBeCloseTo(0.5)
  })

  it('caps at the top level', () => {
    const p = computeLevelProgress(9000, 10)
    expect(p.tier.id).toBe('legend')
    expect(p.next).toBeNull()
    expect(p.remaining).toBe(0)
    expect(p.fraction).toBe(1)
  })

  it('clamps junk input to level 1 and non-negative xp', () => {
    expect(computeLevelProgress(-5, 0).level).toBe(1)
    expect(computeLevelProgress(-5, 0).xp).toBe(0)
    expect(computeLevelProgress(NaN, NaN).level).toBe(1)
    expect(computeLevelProgress(100, 99).level).toBe(10) // level clamped to the max tier
  })
})

describe('getTierLadder', () => {
  it('marks tiers up to the current level as achieved', () => {
    const ladder = getTierLadder(3)
    expect(ladder).toHaveLength(TIERS.length)
    expect(ladder.find((e) => e.current)?.tier.level).toBe(3)
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.level)).toEqual([1, 2, 3])
    expect(ladder.find((e) => e.isNext)?.tier.level).toBe(4)
  })

  it('marks only Newcomer achieved at level 1', () => {
    const ladder = getTierLadder(1)
    expect(ladder.filter((e) => e.achieved).map((e) => e.tier.id)).toEqual(['newcomer'])
    expect(ladder.find((e) => e.current)?.tier.id).toBe('newcomer')
    expect(ladder.find((e) => e.isNext)?.tier.id).toBe('rookie')
  })
})

describe('XP_THRESHOLDS', () => {
  it('has 10 strictly-ascending thresholds starting at 0', () => {
    expect(XP_THRESHOLDS).toHaveLength(10)
    expect(XP_THRESHOLDS[0]).toBe(0)
    for (let i = 1; i < XP_THRESHOLDS.length; i++) {
      expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1])
    }
  })

  it('keeps the tier ladder 10 levels deep and ascending', () => {
    expect(TIERS).toHaveLength(10)
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].level).toBe(TIERS[i - 1].level + 1)
    }
  })
})
