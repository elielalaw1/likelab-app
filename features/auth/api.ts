const SUPABASE_FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!

type TikTokStatsResponse = {
  followers?: number | string
  likes?: number | string
  fallback?: boolean
  error?: string
}

export function stripAtPrefix(value: string) {
  return value.trim().replace(/^@+/, '')
}

export function formatCompactCount(value?: number | string | null) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export async function fetchTikTokStats(handle: string) {
  const trimmed = handle.trim()
  const normalized = stripAtPrefix(trimmed)
  const profileUrl = trimmed.startsWith('http') ? trimmed : `https://www.tiktok.com/@${normalized}`

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/functions/v1/fetch-tiktok-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profileUrl }),
  })

  const payload = (await response.json().catch(() => ({}))) as TikTokStatsResponse

  if (!response.ok) {
    throw new Error(payload?.error || `Could not verify TikTok stats (${response.status})`)
  }

  // Edge function returns a simplified contract; mobile should not parse provider-specific raw payloads.
  const followers = typeof payload?.followers === 'number' || typeof payload?.followers === 'string' ? payload.followers : null
  const likes = typeof payload?.likes === 'number' || typeof payload?.likes === 'string' ? payload.likes : null

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
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || 'Could not create account')
  }

  return data
}

