import { supabase } from '@/lib/supabase'
import { getCurrentUserId } from '@/features/core/supabase-utils'
import { fallbackReferralCode } from '@/features/referral/logic'

export type ReferralStats = {
  // The creator's shareable code (real from backend, or a local fallback).
  code: string
  // Friends who signed up with the code.
  invitedCount: number
  // …of those, how many completed onboarding / "joined".
  joinedCount: number
  // True once the backend is actually issuing codes + tracking referrals.
  // The UI shows a subtle "activating soon" hint while this is false.
  isLive: boolean
  // True when `code` is a real backend-issued code (not the local hash fallback).
  // The invite UI only allows sharing/copying a real code so invitees can redeem it.
  hasBackendCode: boolean
}

// Reads referral state, degrading gracefully to a local mock so the invite UI is
// fully usable before the backend exists. Never throws — any missing column /
// table simply falls back.
//
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND TODO (order from Lovable — verify against the LIVE Supabase project):
//   1. creator_profiles.referral_code  (text, unique, generated on signup)
//   2. creator_profiles.referred_by    (text, nullable — the code they joined with)
//   3. table `referrals` (referrer_id uuid, referred_id uuid, status text
//      'pending'|'joined', created_at) — or derive counts from referred_by.
//   4. Edge Function `redeem-referral`: called at signup with an incoming code →
//      sets referred_by + inserts a referrals row.
//   5. Route https://likelab.io/invite/<code> to signup with the code pre-filled.
//   Once (1)+(3) exist this function returns live data automatically (isLive=true).
// ─────────────────────────────────────────────────────────────────────────────
// Remembers the last real backend code we saw this session, so a transient error
// (network drop / 5xx) doesn't flash the non-redeemable local fallback in its place.
// Scoped to the user it belongs to: a logout→login within the same JS process does
// NOT restart the module, so an un-scoped cache would serve one creator's code to the
// next on a transient read error and misattribute their invitees.
let _lastBackend: { userId: string; code: string } | null = null

export async function getReferralStats(): Promise<ReferralStats> {
  const userId = await getCurrentUserId()
  const fallback: ReferralStats = { code: fallbackReferralCode(userId), invitedCount: 0, joinedCount: 0, isLive: false, hasBackendCode: false }

  // 1) The creator's own code.
  let code = fallback.code
  let hasBackendCode = false
  try {
    const { data, error } = await supabase.from('creator_profiles').select('referral_code').eq('user_id', userId).maybeSingle()
    if (!error && data && typeof data.referral_code === 'string' && data.referral_code) {
      code = data.referral_code
      hasBackendCode = true
      _lastBackend = { userId, code: data.referral_code }
    } else if (error && _lastBackend?.userId === userId) {
      // A transient failure AFTER we already knew THIS user's real code — keep
      // showing it rather than downgrading to the local fallback a friend can't
      // redeem. Gated on userId so we never serve another creator's cached code.
      code = _lastBackend.code
      hasBackendCode = true
    }
  } catch {
    // column/table not there yet — keep the fallback code
  }

  // 2) Referral counts (only meaningful once the table exists).
  let invitedCount = 0
  let joinedCount = 0
  let hasReferralsTable = false
  try {
    const { data, error } = await supabase.from('referrals').select('status').eq('referrer_id', userId)
    if (!error && Array.isArray(data)) {
      hasReferralsTable = true
      invitedCount = data.length
      joinedCount = data.filter((r) => (r as { status?: string }).status === 'joined').length
    }
  } catch {
    // referrals table not there yet — counts stay 0
  }

  return { code, invitedCount, joinedCount, isLive: hasBackendCode && hasReferralsTable, hasBackendCode }
}
