import * as SecureStore from 'expo-secure-store'

// Remembers the highest level we've already celebrated, so the level-up moment fires
// exactly once per real increase (and never on first load, where we just baseline).
const KEY = 'likelab_last_celebrated_level_v1'

export async function getLastCelebratedLevel(): Promise<number | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY)
    if (!v) return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export async function setLastCelebratedLevel(level: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, String(level))
  } catch {
    // non-fatal
  }
}
