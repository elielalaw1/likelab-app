import { buildShareMessage, fallbackReferralCode, parseReferralCode, referralLink, referralMilestone } from '@/features/referral/logic'

describe('fallbackReferralCode', () => {
  it('is deterministic for the same user id', () => {
    expect(fallbackReferralCode('user-abc')).toBe(fallbackReferralCode('user-abc'))
  })

  it('produces a 6-char code from the safe alphabet (no 0/O/1/I)', () => {
    const code = fallbackReferralCode('some-user-uuid-1234')
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
  })

  it('differs for different users (best-effort, no collision on a small sample)', () => {
    const codes = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => fallbackReferralCode(`user-${s}`)))
    expect(codes.size).toBeGreaterThan(1)
  })

  it('handles empty input without throwing', () => {
    expect(fallbackReferralCode('')).toBe('LIKELAB')
  })
})

describe('referralLink / buildShareMessage', () => {
  it('builds the public invite link', () => {
    expect(referralLink('ABC234')).toBe('https://likelab.io/invite/ABC234')
  })

  it('includes the code and link in the share message', () => {
    const msg = buildShareMessage('ABC234')
    expect(msg).toContain('ABC234')
    expect(msg).toContain('https://likelab.io/invite/ABC234')
  })
})

describe('parseReferralCode', () => {
  it('accepts a bare valid code and uppercases it', () => {
    expect(parseReferralCode('abc234')).toBe('ABC234')
    expect(parseReferralCode('ABC234')).toBe('ABC234')
  })

  it('extracts the code from web and scheme invite links', () => {
    expect(parseReferralCode('https://likelab.io/invite/ABC234')).toBe('ABC234')
    expect(parseReferralCode('likelabapp://invite/ABC234')).toBe('ABC234')
    expect(parseReferralCode('https://likelab.io/invite/ABC234?utm=x')).toBe('ABC234')
  })

  it('rejects wrong length or ambiguous characters (0/O/1/I)', () => {
    expect(parseReferralCode('ABC23')).toBeNull() // too short
    expect(parseReferralCode('ABC2345')).toBeNull() // too long
    expect(parseReferralCode('ABO234')).toBeNull() // contains O
    expect(parseReferralCode('ABC201')).toBeNull() // contains 0 and 1
  })

  it('returns null for empty / non-code input', () => {
    expect(parseReferralCode('')).toBeNull()
    expect(parseReferralCode(null)).toBeNull()
    expect(parseReferralCode('https://likelab.io/')).toBeNull()
  })
})

describe('referralMilestone', () => {
  it('reports progress toward the default target of 3', () => {
    const m = referralMilestone(1)
    expect(m.target).toBe(3)
    expect(m.current).toBe(1)
    expect(m.remaining).toBe(2)
    expect(m.fraction).toBeCloseTo(1 / 3)
    expect(m.reached).toBe(false)
  })

  it('caps display once the target is reached or exceeded', () => {
    const m = referralMilestone(5)
    expect(m.current).toBe(3)
    expect(m.remaining).toBe(0)
    expect(m.fraction).toBe(1)
    expect(m.reached).toBe(true)
  })

  it('is empty at zero joins', () => {
    const m = referralMilestone(0)
    expect(m.current).toBe(0)
    expect(m.remaining).toBe(3)
    expect(m.fraction).toBe(0)
    expect(m.reached).toBe(false)
  })

  it('clamps junk input', () => {
    expect(referralMilestone(-4).current).toBe(0)
    expect(referralMilestone(NaN).remaining).toBe(3)
  })
})
