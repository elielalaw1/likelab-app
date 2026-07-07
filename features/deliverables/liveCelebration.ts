import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'

// Remembers which deliverables we've already shown the "You're live" moment for, so it
// fires exactly once per video — never on first load (existing live videos are seeded
// silently as the baseline). Storing the CURRENT live set each run keeps this bounded to
// a creator's handful of live videos and means a video is never celebrated twice.
// Scoped per user id so a different account signing in on the same device doesn't inherit
// the previous account's baseline and fire a bogus "N videos are live" celebration.
const KEY_BASE = 'likelab_celebrated_live_ids_v1'

async function scopedKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id
    return userId ? `${KEY_BASE}_${userId}` : KEY_BASE
  } catch {
    return KEY_BASE
  }
}

export async function getCelebratedLiveIds(): Promise<string[] | null> {
  try {
    const v = await SecureStore.getItemAsync(await scopedKey())
    if (!v) return null
    const arr = JSON.parse(v)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : null
  } catch {
    return null
  }
}

export async function setCelebratedLiveIds(ids: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(await scopedKey(), JSON.stringify(ids))
  } catch {
    // non-fatal
  }
}
