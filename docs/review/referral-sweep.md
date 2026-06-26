Confirmed. The contract mismatch is real: redeem.ts:36 sends `referred_id` while Lovable's invoke example used `new_user_id`. `hasBackendCode` is computed (api.ts:38/43) but never surfaced in the return (api.ts:64). All findings verified against disk. Writing the report.

---

# Referral Redeem Flow — Engineering Review

Mobile-only Expo app, Supabase Live (`xaugfjhocfchhixkfguq`). 7 confirmed issues, all verified against files on disk. Ranked by real-world blast radius.

## Ranked confirmed issues

### 1. HIGH — Likely contract mismatch: client sends `referred_id`, Lovable's invoke example used `new_user_id`
**`features/referral/redeem.ts:36`** — `body: JSON.stringify({ code, referred_id: referredId })`
- **Impact:** If the deployed `redeem-referral` edge fn reads `new_user_id` (per Lovable's example), every redeem returns 400 → mapped to `'rejected'` (line 38) → code consumed forever, referral silently lost. This is the single most likely cause of total feature failure, and combined with issue #2 it is unrecoverable.
- **Fix:** Confirm the exact field name the deployed function destructures. Align client and server on one name (`referred_id`). This is a verification item, not a guaranteed bug — but it must be checked before shipping.

### 2. HIGH — All non-2xx responses collapse to `'rejected'` and permanently burn the code
**`features/referral/redeem.ts:38`** — `return res.ok ? 'ok' : 'rejected'`
- **Impact:** 404 (function not yet deployed / staged rollout), 401/403 (gateway wants anon key), 400 (the field-name mismatch above), 429, 500 are all indistinguishable from a genuine decline. `redeemPendingReferral` (lines 53–58) only retries on a network throw (`'error'`); `'rejected'` consumes the code (line 58) and leaves `_settledFor = userId` (line 52) so the guard at line 49 blocks any retry on future auth events. No user feedback. Infra hiccup = permanently lost referral.
- **Fix:** Inspect `res.status`. Treat 5xx/404/408/429 and network throws as retryable `'error'` (don't consume; `_settledFor` already resets on `'error'` at line 55). Only treat 2xx and genuine business declines (409 duplicate / 422 self-referral) as terminal. Parse the response body to log the server's reason.

### 3. MEDIUM — Fallback (non-existent) code is fully shareable; Copy/Share never gate on a real backend code
**`app/invite.tsx:109–128` (handlers), `:159` (render); root cause `features/referral/api.ts:64`**
- **Impact:** When `creator_profiles.referral_code` isn't populated yet, `getReferralStats` returns a local hash `fallbackReferralCode(userId)` with `isLive:false`. `hasBackendCode` is computed (api.ts:38/43) but **not returned** — line 64 only exposes `isLive: hasBackendCode && hasReferralsTable`. So the UI can't tell a real code from a fake one. Copy/Share gate only on `if (!data?.code) return`, never on `isLive`. A creator shares a real-looking 6-char code that passes client validation (`parseReferralCode`, logic.ts) but is not in the DB → invitee's redeem fails → swallowed as `'rejected'`. Confined to the pre/partial-backend rollout window.
- **Fix:** Add `hasBackendCode` to `ReferralStats` and gate Copy/Share on it. When no real code exists, disable the buttons with a "Your code is being set up" state. Never feed `fallbackReferralCode` into `buildShareMessage`/Clipboard.

### 4. MEDIUM — Pending code is RAM-only; dies across the email-OTP gap
**`features/referral/redeem.ts:8`** — `let _pendingCode: string | null = null`
- **Impact:** Written in `app/signup.tsx:157` (`setPendingReferralCode`) *before* any auth session exists. Session is created later in `app/verify-otp.tsx:81` (`signInWithPassword`) → `onAuthStateChange` → `redeemPendingReferral`. The user must leave the app to read the emailed OTP; a backgrounded-app kill / OOM / dev fast-refresh re-inits `_pendingCode` to `null`. `consumePendingAuth()` is also empty, so verify-otp routes to `/login` (lines 106–109), and the later login no-ops at redeem.ts:51. Referral silently never redeemed. Conditional on process death during the email gap — not every time, but backgrounding to fetch the OTP is the norm.
- **Fix:** Persist the pending code in `setPendingReferralCode` (AsyncStorage/SecureStore), read it back in `peek`, clear on consume. Or carry the code in the pending-auth payload and redeem right after `signInWithPassword`.

### 5. MEDIUM — Universal/deep link to `/invite/<CODE>` has no matching route
**`app/_layout.tsx:281`** — only `<Stack.Screen name="invite" />` (maps to `app/invite.tsx`, the signed-in share screen)
- **Impact:** `referralLink()` builds `https://likelab.io/invite/ABC234` (logic.ts:49–51); Android intent filter is `pathPrefix /invite` (app.json:43). No `app/invite/[code].tsx` and no `app/+not-found.tsx` exist, so tapping the link lands on Expo Router's unmatched-route screen instead of signup/login. **Redemption itself still works** — `ReferralLinkHandler.tsx:17–29` reads the raw launch URL out-of-band and captures the code. This is a navigation/UX gap, not a functional break.
- **Fix:** Add `app/invite/[code].tsx` that reads `code`, calls `setPendingReferralCode(code)`, and redirects to `/signup` (or `/(tabs)/overview` if signed in). Add `app/+not-found.tsx` redirecting to `/login` as a safety net. Register the new route in the Stack.

### 6. LOW — "Activates shortly" hint actively tells users to share the broken fallback code
**`app/invite.tsx:183–190`** — "Your code is ready to share now — invite tracking activates shortly."
- **Impact:** Shown exactly when `isLive` is false, which includes the case where `code` is the non-redeemable fallback. Copy says the opposite of the truth. Conflates "real code, tracking pending" (safe) with "fallback code" (not shareable).
- **Fix:** Only show "ready to share now" when `hasBackendCode` is true. When the code is the fallback, show "Setting up your invite code…" and suppress sharing (per #3). Requires exposing `hasBackendCode`.

### 7. LOW — 5-min staleTime + `placeholderData` keeps the fallback code visible after backend goes live
**`features/referral/hooks.ts:8,10`** — `staleTime: 5*60*1000`, `placeholderData: (previous) => previous`
- **Impact:** Worse than the original claim: `lib/query-client.ts:19–20` sets global `refetchOnWindowFocus:false` and `refetchOnMount:false`, and `useReferral` doesn't override them. The `['referral']` query is never invalidated anywhere in the codebase. So a once-cached fallback persists past 5 minutes — across remounts and refocus — until `refetchOnReconnect` fires or the process restarts. Widens the window in which the broken fallback is shareable; no refresh affordance on `/invite`.
- **Fix:** Lower `staleTime`, add `refetchOnMount`/pull-to-refresh on `/invite`, and/or invalidate `['referral']` after auth/profile changes.

## Verification checklist — Live (Lovable/Supabase) side

Must all be true for end-to-end tracking to work. Items 1–2 are gating; the feature is dead without them.

- [ ] **Field name.** Confirm the deployed `redeem-referral` reads `referred_id` (what the client sends, redeem.ts:36), **not** `new_user_id` (Lovable's invoke example). Mismatch = every redeem 400s and is silently dropped. **Highest priority.**
- [ ] **Function deployed to Live (not just Test).** `redeem-referral` must exist and respond 2xx on Live (`xaugfjhocfchhixkfguq`). A 404 during staged rollout permanently burns codes (issue #2). Verify `verify_jwt=false` so the client's no-auth-header POST is accepted.
- [ ] **`creator_profiles.referral_code` populated on Live.** `trg_assign_referral_code` must actually assign a code on insert, and the column must be readable by the creator (`api.ts:40`). If empty, `hasBackendCode=false` → fallback code shared (issues #3, #6).
- [ ] **`referrals` table readable under RLS.** `getReferralStats` selects `from('referrals').eq('referrer_id', userId)` (api.ts:54). RLS is `auth.uid() = referrer_id` — confirm the creator can read their own rows so counts/`isLive` work. (The edge fn writes the row; it bypasses RLS via service role — verify that too.)
- [ ] **Trigger ordering.** `trg_assign_referral_code` must commit the referrer's code and the referred user row **before** `redeem-referral` looks them up, or the lookup 4xx/5xx's → consumed as `'rejected'` (issue #2). Confirm whether the edge fn returns a transient/retryable status vs. a hard decline in the not-yet-ready case.
- [ ] **`trg_mark_referral_joined`** flips `pending → joined` on application approval, so `joinedCount` (api.ts:58) is ever non-zero.
- [ ] **Web → app handoff.** `https://likelab.io/invite/<code>` (Lovable-hosted) must redirect to the App Store / open the app with the code preserved. iOS `applinks:likelab.io` (app.json:19) requires a valid AASA file on likelab.io listing the `/invite/*` path. Without it, Universal Links won't open the app at all.
