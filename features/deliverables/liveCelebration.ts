import * as SecureStore from 'expo-secure-store'

// Remembers which deliverables we've already shown the "You're live" moment for, so it
// fires exactly once per video — never on first load (existing live videos are seeded
// silently as the baseline). Storing the CURRENT live set each run keeps this bounded to
// a creator's handful of live videos and means a video is never celebrated twice.
const KEY = 'likelab_celebrated_live_ids_v1'

export async function getCelebratedLiveIds(): Promise<string[] | null> {
  try {
    const v = await SecureStore.getItemAsync(KEY)
    if (!v) return null
    const arr = JSON.parse(v)
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : null
  } catch {
    return null
  }
}

export async function setCelebratedLiveIds(ids: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(ids))
  } catch {
    // non-fatal
  }
}
