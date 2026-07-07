import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'

// Remembers the highest level we've already celebrated, so the level-up moment fires
// exactly once per real increase (and never on first load, where we just baseline).
// Scoped per user id so switching accounts on one device can't inherit another
// creator's baseline and fire a bogus "level up".
const KEY_BASE = 'likelab_last_celebrated_level_v1'

async function scopedKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id
    return userId ? `${KEY_BASE}_${userId}` : KEY_BASE
  } catch {
    return KEY_BASE
  }
}

export async function getLastCelebratedLevel(): Promise<number | null> {
  try {
    const v = await SecureStore.getItemAsync(await scopedKey())
    if (!v) return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export async function setLastCelebratedLevel(level: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(await scopedKey(), String(level))
  } catch {
    // non-fatal
  }
}
