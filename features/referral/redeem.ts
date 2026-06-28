import * as SecureStore from 'expo-secure-store'
import * as Clipboard from 'expo-clipboard'
import { parseReferralCode } from '@/features/referral/logic'
import { supabase } from '@/lib/supabase'

const FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!

// Key under which the pending code is persisted, so it survives an app
// background/kill during the email-OTP gap between signup and verification.
const PENDING_CODE_KEY = 'likelab_pending_referral_v1'

// First-launch-only marker so we read the clipboard at most once per install.
const CLIPBOARD_CHECKED_KEY = 'likelab_clipboard_referral_checked_v1'

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

let _clipboardChecked = false

// Fresh-install bridge: a user who taps an invite link WITHOUT the app installed
// lands on the web fallback (likelab.io/invite/<code>), which copies the code to
// the clipboard, then sends them to the App Store. After they install + open, the
// Universal Link is gone — the clipboard is the only carrier. Read it ONCE per
// install (so we never spam the iOS paste banner or mis-read later clipboard
// content) and only while logged out (a signed-in user isn't redeeming a fresh
// invite). The backend validates the code, so a stray clipboard value is harmless.
export async function captureClipboardReferralCode(): Promise<void> {
  if (_pendingCode || _clipboardChecked) return
  _clipboardChecked = true
  try {
    if (await SecureStore.getItemAsync(CLIPBOARD_CHECKED_KEY)) return
    const { data } = await supabase.auth.getSession()
    // Burn the one-shot marker regardless so we never re-read on later launches.
    await SecureStore.setItemAsync(CLIPBOARD_CHECKED_KEY, '1').catch(() => {})
    if (data.session) return // signed-in user — not a fresh-install invite redemption
    if (!(await Clipboard.hasStringAsync())) return
    const text = await Clipboard.getStringAsync()
    setPendingReferralCode(text) // parses; no-op unless it's a real code / invite link
    if (peekPendingReferralCode()) console.log('[referral] captured pending code from clipboard')
  } catch {
    // clipboard / storage unavailable — non-fatal
  }
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
// In-flight lock so two near-simultaneous callers (ReferralLinkHandler fires from
// several sources at mount) can't both pass the guard and double-POST the redeem.
const _inflight = new Set<string>()
export async function redeemPendingReferral(userId: string): Promise<void> {
  if (!userId || _settledFor === userId || _inflight.has(userId)) return
  await hydratePendingReferralCode() // restore a code persisted across an app restart
  const code = peekPendingReferralCode()
  if (!code) {
    console.log('[referral] redeem skipped — no pending code found')
    return
  }
  console.log('[referral] redeeming pending code for user', userId)
  // A concurrent caller may have won the race during the hydrate await — re-check
  // before committing. (Synchronous from here to add(), so only one caller passes.)
  if (_inflight.has(userId)) return
  _inflight.add(userId)
  try {
    _settledFor = userId
    let result = await redeemReferral(code, userId)
    for (let i = 0; result === 'error' && i < REDEEM_RETRY_DELAYS_MS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, REDEEM_RETRY_DELAYS_MS[i]))
      result = await redeemReferral(code, userId)
    }
    if (result === 'error') {
      _settledFor = null // still failing — fall back to retrying on the next auth event
      console.log('[referral] redeem transient error — will retry on next auth event')
      return
    }
    console.log('[referral] redeem settled:', result)
    consumePendingReferralCode() // accepted or declined — done either way
  } finally {
    _inflight.delete(userId)
  }
}
