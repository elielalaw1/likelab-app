export function formatCurrencySek(value?: number | null) {
  if (typeof value !== 'number') return ''
  return `${Math.round(value).toLocaleString('sv-SE')} SEK`
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
