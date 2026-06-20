import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import { supabase } from '@/lib/supabase'

const CLIENT_KEY = process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY
const SUPABASE_FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
export const TIKTOK_REDIRECT_URI = process.env.EXPO_PUBLIC_TIKTOK_REDIRECT_URI || 'https://likelab.io/auth/tiktok/callback'
export const TIKTOK_APP_RETURN_URI = 'likelabapp:///auth/tiktok/callback'
const SCOPES = 'user.info.basic,user.info.stats,user.info.profile'

type TikTokAuthorizationResult = {
  code: string
  state: string
  redirectUri: string
}

type ExchangeResponse = {
  error?: string
  error_description?: string
  message?: string
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const record = payload as ExchangeResponse
    const message = record.error_description || record.error || record.message
    if (message) return message
  }
  return fallback
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function toUserFacingExchangeError(message: string) {
  if (/invalid token|unauthorized/i.test(message)) {
    return 'Your login session expired. Please log in again and connect TikTok once more.'
  }
  return message
}

export async function authorizeTikTok(): Promise<TikTokAuthorizationResult | null> {
  if (!CLIENT_KEY) {
    throw new Error('TikTok client key is missing from this app build.')
  }

  const state = Crypto.randomUUID()

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
  })

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`

  const result = await WebBrowser.openAuthSessionAsync(authUrl, TIKTOK_APP_RETURN_URI)

  if (result.type !== 'success') return null

  const url = new URL(result.url)
  const authError = url.searchParams.get('error')
  if (authError) {
    throw new Error(url.searchParams.get('error_description') || authError)
  }

  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')

  if (!code) {
    throw new Error('TikTok did not return an authorization code.')
  }

  if (returnedState !== state) {
    throw new Error('TikTok authorization state did not match. Please try again.')
  }

  return { code, state, redirectUri: TIKTOK_REDIRECT_URI }
}

export async function exchangeTikTokCode({ code, redirectUri }: Pick<TikTokAuthorizationResult, 'code' | 'redirectUri'>) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new Error('You need to log in again before connecting TikTok.')
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/functions/v1/exchange-tiktok-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code, redirectUri }),
  })

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    const message = readErrorMessage(payload, `Could not connect TikTok (${response.status})`)
    console.warn('TikTok exchange failed', { status: response.status, message })
    throw new Error(toUserFacingExchangeError(message))
  }

  return payload
}

export async function connectTikTokAccount() {
  const result = await authorizeTikTok()
  if (!result) return null

  await exchangeTikTokCode(result)
  return result
}

export const connectTikTok = authorizeTikTok

export async function disconnectTikTokAccount() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  const userId = data.user?.id
  if (!userId) throw new Error('You must be logged in to disconnect TikTok.')

  const { error: updateError } = await supabase
    .from('creator_profiles')
    .update({
      tiktok_open_id: null,
      tiktok_access_token: null,
      tiktok_refresh_token: null,
      tiktok_token_expires_at: null,
      tiktok_refresh_expires_at: null,
      tiktok_connected: false,
      tiktok_handle: null,
      tiktok_profile_url: null,
      tiktok_avatar_url: null,
      tiktok_bio: null,
      tiktok_verified: false,
      tiktok_follower_count: null,
      tiktok_following_count: null,
      tiktok_likes_count: null,
      tiktok_video_count: null,
    })
    .eq('user_id', userId)

  if (updateError) throw new Error(updateError.message)
}
