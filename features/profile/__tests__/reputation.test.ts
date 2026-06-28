import {
  computeReputation,
  countCompletedDeliverables,
  isCompletedDeliverable,
} from '@/features/profile/reputation'

const del = (status: string) => ({ status }) as Parameters<typeof isCompletedDeliverable>[0]

describe('isCompletedDeliverable / countCompletedDeliverables', () => {
  it('counts only approved + published as completed', () => {
    expect(isCompletedDeliverable(del('approved'))).toBe(true)
    expect(isCompletedDeliverable(del('published'))).toBe(true)
    expect(isCompletedDeliverable(del('pending'))).toBe(false)
    expect(isCompletedDeliverable(del('revision_requested'))).toBe(false)
  })

  it('tallies completed across a list and tolerates null', () => {
    const list = ['approved', 'pending', 'published', 'submitted', 'approved'].map(del)
    expect(countCompletedDeliverables(list)).toBe(3)
    expect(countCompletedDeliverables(null)).toBe(0)
    expect(countCompletedDeliverables(undefined)).toBe(0)
  })
})

describe('computeReputation', () => {
  it('drives score off completed deliverables with a saturating curve', () => {
    expect(computeReputation({ completed: 0 }).score).toBe(0)
    expect(computeReputation({ completed: 12 }).score).toBe(50) // 100*12/(12+12)
    expect(computeReputation({ completed: 12 }).completed).toBe(12)
    expect(computeReputation({ completed: 1000 }).score).toBeGreaterThan(90)
  })

  it('exposes the completed signal as live with a human display', () => {
    const completed = computeReputation({ completed: 1 }).signals.find((s) => s.id === 'completed')!
    expect(completed.tracked).toBe(true)
    expect(completed.display).toBe('1 job')
    expect(computeReputation({ completed: 3 }).signals[0].display).toBe('3 jobs')
  })

  it('marks on-time/quality/reach as untracked until a rate is supplied', () => {
    const r = computeReputation({ completed: 5 })
    for (const id of ['onTime', 'quality', 'reach']) {
      const s = r.signals.find((sig) => sig.id === id)!
      expect(s.tracked).toBe(false)
      expect(s.value).toBeNull()
      expect(s.display).toBe('Soon')
    }
  })

  it('lights up a future signal once its rate goes live (backend swap)', () => {
    const onTime = computeReputation({ completed: 5, onTimeRate: 0.8 }).signals.find((s) => s.id === 'onTime')!
    expect(onTime.tracked).toBe(true)
    expect(onTime.value).toBeCloseTo(0.8)
    expect(onTime.display).toBe('80%')
  })

  it('clamps junk completed input to zero', () => {
    expect(computeReputation({ completed: -4 }).completed).toBe(0)
    expect(computeReputation({ completed: NaN }).completed).toBe(0)
  })
})
