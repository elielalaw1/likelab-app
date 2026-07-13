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

// ─── In-memory session view ────────────────────────────────────────────────────
// The persisted set above is hydrated ONCE into this module-level mirror, which then
// becomes the session source of truth. LiveCelebrationHost reconciles the live set
// against it SYNCHRONOUSLY (no per-change async SecureStore read), which removes the
// race where a second deliverables update during an in-flight read dropped a real
// "You're live" moment. Other flows (the direct-delivery in-row celebration) can also
// pre-mark an id here so the global host never double-celebrates a video that already
// had its own in-row moment.
//   null  → baseline not established yet; the host seeds it silently (celebrates nothing)
//   Set   → the ids already celebrated this + prior sessions
let _seen: Set<string> | null = null
let _hydrated = false

// Load the persisted baseline into memory exactly once.
export async function hydrateCelebratedLiveIds(): Promise<void> {
  if (_hydrated) return
  const ids = await getCelebratedLiveIds()
  _seen = ids == null ? null : new Set(ids)
  _hydrated = true
}

// Current in-memory baseline (null until the host's first reconcile seeds it).
export function getSeenLiveIds(): Set<string> | null {
  return _seen
}

// Replace the whole set — memory + storage. Called by the host after each reconcile.
export function commitCelebratedLiveIds(ids: string[]): void {
  _seen = new Set(ids)
  void setCelebratedLiveIds(ids)
}

// Mark one id as already celebrated without disturbing the baseline. Used by the
// direct-delivery in-row celebration so the global "You're live" host skips it. If the
// baseline isn't established yet (_seen == null) we do nothing: the host will seed its
// baseline silently on its next reconcile, which already covers this id.
export function markLiveCelebrated(id: string): void {
  if (_seen == null || _seen.has(id)) return
  _seen.add(id)
  void setCelebratedLiveIds(Array.from(_seen))
}
