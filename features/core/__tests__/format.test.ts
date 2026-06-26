import {
  formatRewardType,
  formatKr,
  formatCurrencySek,
  getDaysLeft,
  countryFlag,
  normalizeStatus,
  formatCampaignGoal,
  looksLikeTikTokUrl,
} from '@/features/core/format'

// Business rule: creators must NEVER see a SEK amount — only the reward TYPE.
// This is a deliberate product decision; a regression here leaks pricing to
// creators, so we lock the mapping down explicitly.
describe('formatRewardType', () => {
  it('maps all cash-like raw values to "Cash"', () => {
    for (const raw of ['cash', 'money', 'sek', 'fixed', 'tiered', 'payout', 'CASH']) {
      expect(formatRewardType({ rewardType: raw })).toBe('Cash')
    }
  })

  it('maps product- and experience-like values to their group', () => {
    expect(formatRewardType({ rewardType: 'gifted' })).toBe('Product')
    expect(formatRewardType({ rewardType: 'free_product' })).toBe('Product')
    expect(formatRewardType({ rewardType: 'event' })).toBe('Experience')
    expect(formatRewardType({ rewardType: 'trip' })).toBe('Experience')
  })

  it('title-cases unknown types and handles empty input', () => {
    expect(formatRewardType({ rewardType: 'collab' })).toBe('Collab')
    expect(formatRewardType({ rewardType: '' })).toBe('')
    expect(formatRewardType({ rewardType: null })).toBe('')
  })
})

// Helper: sv-SE groups thousands with a (narrow) non-breaking space. We strip
// all whitespace so the assertion is stable across ICU versions.
const digits = (s: string) => s.replace(/\s/g, '')

describe('formatKr / formatCurrencySek', () => {
  it('formats and rounds with a kr suffix', () => {
    expect(digits(formatKr(5000))).toBe('5000kr')
    expect(digits(formatKr(1234.6))).toBe('1235kr')
  })

  it('formats SEK suffix variant', () => {
    expect(digits(formatCurrencySek(5000))).toBe('5000SEK')
  })

  it('returns empty string for non-numbers and non-finite values', () => {
    expect(formatKr(null)).toBe('')
    expect(formatKr(undefined)).toBe('')
    expect(formatKr(Infinity)).toBe('')
  })
})

// Critical flow: campaign deadline display. A prior bug shifted "days left" by
// ±1 for non-UTC users because local date parts were used. The fix compares
// whole calendar days in UTC — these tests pin that behaviour with a fixed clock.
describe('getDaysLeft', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-25T10:00:00Z'))
  })
  afterAll(() => {
    jest.useRealTimers()
  })

  it('counts whole calendar days until the end date', () => {
    expect(getDaysLeft('2026-06-28')).toBe(3)
    expect(getDaysLeft('2026-06-26')).toBe(1)
  })

  it('never returns negative — past deadlines clamp to 0', () => {
    expect(getDaysLeft('2026-06-20')).toBe(0)
  })

  it('returns null for missing or invalid dates', () => {
    expect(getDaysLeft(null)).toBeNull()
    expect(getDaysLeft('not-a-date')).toBeNull()
  })
})

describe('countryFlag', () => {
  it('renders a flag emoji from ISO code or country name', () => {
    expect(countryFlag('SE')).toBe('🇸🇪')
    expect(countryFlag('sweden')).toBe('🇸🇪')
    expect(countryFlag('Sverige')).toBe('🇸🇪')
  })

  it('returns empty string for unknown or blank input', () => {
    expect(countryFlag('')).toBe('')
    expect(countryFlag('Atlantis')).toBe('')
  })
})

describe('normalizeStatus / formatCampaignGoal / looksLikeTikTokUrl', () => {
  it('normalizes status to trimmed lowercase', () => {
    expect(normalizeStatus('  In_Review ')).toBe('in_review')
    expect(normalizeStatus(null)).toBe('')
  })

  it('humanizes a campaign goal slug', () => {
    expect(formatCampaignGoal('brand_awareness')).toBe('Brand Awareness')
    expect(formatCampaignGoal(null)).toBe('')
  })

  it('detects tiktok hostnames loosely', () => {
    expect(looksLikeTikTokUrl('https://www.tiktok.com/@user')).toBe(true)
    expect(looksLikeTikTokUrl('garbage')).toBe(false)
  })
})
