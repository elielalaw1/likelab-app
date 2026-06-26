import { parseReferralCode } from '@/features/referral/logic'

const FUNCTIONS_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!

// In-memory pending code captured from a deep link / invite field, redeemed once
// the new account authenticates. Mirrors the in-memory `pending-auth` handoff —
// same app session, so no persistent storage needed.
let _pendingCode: string | null = null

// Stores a code if `input` parses to a valid one (accepts bare codes or links).
export function setPendingReferralCode(input: string | null | undefined): void {
  const parsed = parseReferralCode(input)
  if (parsed) _pendingCode = parsed
}

export function peekPendingReferralCode(): string | null {
  return _pendingCode
}

export function consumePendingReferralCode(): string | null {
  const code = _pendingCode
  _pendingCode = null
  return code
}

type RedeemResult = 'ok' | 'rejected' | 'error'

// Calls the `redeem-referral` Edge Function (verify_jwt=false → no auth header,
// same as signup-creator). Returns 'rejected' when the server processed but
// declined (self-referral, duplicate), 'error' only on a network failure.
export async function redeemReferral(code: string, referredId: string): Promise<RedeemResult> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/functions/v1/redeem-referral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, referred_id: referredId }),
    })
    return res.ok ? 'ok' : 'rejected'
  } catch {
    return 'error'
  }
}

// Redeems any pending code for the just-authenticated user. Idempotent and safe
// to call on every auth event: no-op without a pending code, and it won't retry
// the same user once the server has accepted or declined.
let _settledFor: string | null = null
export async function redeemPendingReferral(userId: string): Promise<void> {
  if (!userId || _settledFor === userId) return
  const code = peekPendingReferralCode()
  if (!code) return
  _settledFor = userId
  const result = await redeemReferral(code, userId)
  if (result === 'error') {
    _settledFor = null // transient — allow a retry on the next auth event
    return
  }
  consumePendingReferralCode() // accepted or declined — done either way
}
