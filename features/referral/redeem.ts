import * as SecureStore from 'expo-secure-store'
import { parseReferralCode } from '@/features/referral/logic'

const FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!

// Key under which the pending code is persisted, so it survives an app
// background/kill during the email-OTP gap between signup and verification.
const PENDING_CODE_KEY = 'likelab_pending_referral_v1'

// In-memory pending code captured from a deep link / invite field, redeemed once
// the new account authenticates. Mirrored to SecureStore so it isn't lost if the
// app is backgrounded/killed before the new account authenticates.
let _pendingCode: string | null = null

// Stores a code if `input` parses to a valid one (accepts bare codes or links).
export function setPendingReferralCode(input: string | null | undefined): void {
  const parsed = parseReferralCode(input)
  if (parsed) {
    _pendingCode = parsed
    // Fire-and-forget persistence — the in-memory value is the source of truth.
    void SecureStore.setItemAsync(PENDING_CODE_KEY, parsed).catch(() => {})
  }
}

// Synchronous — used in a UI useEffect. Only sees the in-memory value.
export function peekPendingReferralCode(): string | null {
  return _pendingCode
}

// Rehydrates `_pendingCode` from SecureStore when it isn't already in memory
// (e.g. after an app restart during the signup → verify gap). Awaited before the
// redeem peek so a persisted code isn't silently lost.
async function hydratePendingReferralCode(): Promise<void> {
  if (_pendingCode) return
  try {
    const stored = await SecureStore.getItemAsync(PENDING_CODE_KEY)
    const parsed = parseReferralCode(stored)
    if (parsed) _pendingCode = parsed
  } catch {
    // SecureStore unavailable — nothing to hydrate
  }
}

export function consumePendingReferralCode(): string | null {
  const code = _pendingCode
  _pendingCode = null
  void SecureStore.deleteItemAsync(PENDING_CODE_KEY).catch(() => {})
  return code
}

type RedeemResult = 'ok' | 'rejected' | 'error'

// Calls the `redeem-referral` Edge Function (verify_jwt=false → no auth header,
// same as signup-creator). Returns:
//   'ok'       — 2xx, the server accepted the referral.
//   'rejected' — a genuine business decline (400/404/409/422) — terminal.
//   'error'    — transient/infra failure (5xx/408/429) or a network error —
//                retryable; the caller leaves the code in place to retry later.
export async function redeemReferral(code: string, referredId: string): Promise<RedeemResult> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/functions/v1/redeem-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, referred_id: referredId }),
    })
    if (res.ok) return 'ok'
    // 5xx, request timeout and rate-limit are transient — retry on the next auth event.
    // (The backend returns 503 for the not-yet-committed race case.)
    const retryable = res.status >= 500 || res.status === 408 || res.status === 429
    if (!retryable) {
      // Best-effort: surface the server's decline reason for logs (non-fatal).
      try {
        const body = await res.json()
        console.warn('redeem-referral declined', res.status, body)
      } catch {
        console.warn('redeem-referral declined', res.status)
      }
    }
    return retryable ? 'error' : 'rejected'
  } catch {
    return 'error'
  }
}

// Bounded immediate retries for the transient race the backend signals with 503
// (the new creator's row / referral_code not yet committed by trg_assign_referral_code).
// It usually clears within a few seconds, so a short backoff redeems in-session
// rather than waiting for the next auth event.
const REDEEM_RETRY_DELAYS_MS = [1500, 3000, 5000]

// Redeems any pending code for the just-authenticated user. Idempotent and safe
// to call on every auth event: no-op without a pending code, and it won't retry
// the same user once the server has accepted or declined.
let _settledFor: string | null = null
export async function redeemPendingReferral(userId: string): Promise<void> {
  if (!userId || _settledFor === userId) return
  await hydratePendingReferralCode() // restore a code persisted across an app restart
  const code = peekPendingReferralCode()
  if (!code) return
  _settledFor = userId
  let result = await redeemReferral(code, userId)
  for (let i = 0; result === 'error' && i < REDEEM_RETRY_DELAYS_MS.length; i++) {
    await new Promise((resolve) => setTimeout(resolve, REDEEM_RETRY_DELAYS_MS[i]))
    result = await redeemReferral(code, userId)
  }
  if (result === 'error') {
    _settledFor = null // still failing — fall back to retrying on the next auth event
    return
  }
  consumePendingReferralCode() // accepted or declined — done either way
}
