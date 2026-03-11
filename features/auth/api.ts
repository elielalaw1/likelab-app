const SUPABASE_FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xaugfjhocfchhixkfguq.supabase.co'
const AUTH_REDIRECT_ORIGIN =
  process.env.EXPO_PUBLIC_AUTH_REDIRECT_ORIGIN || process.env.EXPO_PUBLIC_WEB_URL || 'https://likelab.se'

type TikTokStatsResponse = {
  followers?: number
  likes?: number
}

export function stripAtPrefix(value: string) {
  return value.trim().replace(/^@+/, '')
}

export function formatCompactCount(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(value))
}

export async function fetchTikTokStats(handle: string) {
  const normalized = stripAtPrefix(handle)
  const profileUrl = `https://www.tiktok.com/@${normalized}`

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/functions/v1/fetch-tiktok-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profileUrl }),
  })

  if (!response.ok) {
    throw new Error('Could not verify TikTok stats')
  }

  // Edge function returns a simplified contract; mobile should not parse provider-specific raw payloads.
  const payload = (await response.json()) as TikTokStatsResponse
  const followers = typeof payload?.followers === 'number' ? payload.followers : null
  const likes = typeof payload?.likes === 'number' ? payload.likes : null

  return {
    followersRaw: followers,
    likesRaw: likes,
    followersFormatted: formatCompactCount(followers),
    likesFormatted: formatCompactCount(likes),
  }
}

export async function signupCreator(payload: {
  email: string
  password: string
  displayName: string
  tiktokHandle: string
  instagramHandle?: string | null
  followers?: string | null
  likes?: string | null
}) {
  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/functions/v1/signup-creator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      display_name: payload.displayName,
      tiktok_handle: stripAtPrefix(payload.tiktokHandle),
      instagram_handle: payload.instagramHandle ? stripAtPrefix(payload.instagramHandle) : null,
      followers: payload.followers ?? null,
      likes: payload.likes ?? null,
      // TODO(auth): switch this to a mobile deep-link redirect when email verification flow is implemented end-to-end.
      origin: AUTH_REDIRECT_ORIGIN,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || 'Could not create account')
  }

  return data
}
