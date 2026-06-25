export function formatCurrencySek(value?: number | null) {
  if (typeof value !== 'number') return ''
  return `${Math.round(value).toLocaleString('sv-SE')} SEK`
}

// Redesign currency: lowercase `kr` suffix with thin-space thousands separator
// (e.g. "5 000 kr"). sv-SE locale already groups with a narrow/no-break space.
export function formatKr(value?: number | null) {
  if (typeof value !== 'number' || !isFinite(value)) return ''
  return `${Math.round(value).toLocaleString('sv-SE')} kr`
}

// Creator-facing reward label — shows the reward TYPE (Cash / Experience /
// Product …), never a SEK amount. The underlying sums (prize_distribution,
// reward_value_sek) are deliberately not surfaced to creators here.
export function formatRewardType(campaign: { rewardType?: string | null }): string {
  const raw = (campaign.rewardType || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  const MAP: Record<string, string> = {
    cash: 'Cash', money: 'Cash', sek: 'Cash', fixed: 'Cash', tiered: 'Cash', payout: 'Cash',
    product: 'Product', gift: 'Product', gifted: 'Product', gifting: 'Product', free_product: 'Product',
    experience: 'Experience', event: 'Experience', trip: 'Experience',
  }
  return MAP[lower] || (lower.charAt(0).toUpperCase() + lower.slice(1))
}

export function formatCampaignGoal(value?: string | null) {
  if (!value) return ''
  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return ''
  const asDate = (input?: string | null) => {
    if (!input) return ''
    const d = new Date(input)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const s = asDate(start)
  const e = asDate(end)
  if (s && e) return `${s} - ${e}`
  return s || e
}

export function getDaysLeft(endDate?: string | null) {
  if (!endDate) return null
  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return null

  // Compare whole calendar days in UTC. endDate comes from the DB as a UTC ISO
  // string; reading it with local getFullYear/Month/Date and rebuilding a local
  // Date shifted the day by ±1 for non-UTC users (off-by-one "days left").
  const now = new Date()
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const targetDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const diffMs = targetDay - startOfToday

  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  sweden: 'SE',
  sverige: 'SE',
  norway: 'NO',
  norge: 'NO',
  denmark: 'DK',
  finland: 'FI',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  'united states': 'US',
  usa: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
}

export function countryFlag(value?: string | null) {
  if (!value) return ''

  const normalized = value.trim()
  if (!normalized) return ''

  const upperCode = normalized.toUpperCase()
  const code = /^[A-Z]{2}$/.test(upperCode) ? upperCode : COUNTRY_NAME_TO_CODE[normalized.toLowerCase()]
  if (!code) return ''

  return Array.from(code)
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

export function normalizeStatus(raw?: string | null) {
  return (raw || '').trim().toLowerCase()
}

export function looksLikeTikTokUrl(input: string) {
  try {
    const parsed = new URL(input.trim())
    return parsed.hostname.includes('tiktok.com')
  } catch {
    return false
  }
}
