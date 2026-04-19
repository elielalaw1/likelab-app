import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'

const AUTH_BASE_URL = 'https://likelab.io/mobile-auth'
const REDIRECT_URI = 'likelabapp://auth/callback'

export async function openAuthInBrowser(mode: 'login' | 'signup' = 'login'): Promise<boolean> {
  const url = `${AUTH_BASE_URL}?mode=${mode}`

  const result = await WebBrowser.openAuthSessionAsync(url, REDIRECT_URI)

  if (result.type === 'success' && result.url) {
    const hashParams = new URLSearchParams(result.url.split('#')[1] || '')
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.error('Failed to set session:', error.message)
        return false
      }
      return true
    }
  }

  return false
}
