export function formatCurrencySek(value?: number | null) {
  if (typeof value !== 'number') return ''
  return `${Math.round(value).toLocaleString('sv-SE')} SEK`
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

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const diffMs = targetDay.getTime() - startOfToday.getTime()

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
