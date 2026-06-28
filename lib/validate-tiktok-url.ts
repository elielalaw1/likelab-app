const TIKTOK_PATTERN = /^https?:\/\/(www\.|m\.|vm\.|vt\.)?tiktok\.com(\/|$)/i

export function isValidTikTokUrl(url: string): boolean {
  return TIKTOK_PATTERN.test(url.trim())
}
