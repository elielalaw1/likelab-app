// Pure, render-free helpers for the referral / invite loop. No backend or React
// here so the code generation, share copy and milestone maths stay unit-testable
// (see __tests__/logic.test.ts).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I

function hash(input: string, seed: number): number {
  let h = seed >>> 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(h, 31) + input.charCodeAt(i)) >>> 0
  }
  return h
}

// Deterministic 6-char code derived from the user id. Used as a LOCAL fallback so
// the invite UI works before the backend issues real `referral_code`s — same id
// always yields the same code, and it avoids ambiguous characters.
export function fallbackReferralCode(userId: string): string {
  if (!userId) return 'LIKELAB'
  let a = hash(userId, 7)
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[a % ALPHABET.length]
    a = Math.floor(a / ALPHABET.length)
    if (a < ALPHABET.length) a = hash(out, 131) // re-seed so all 6 chars vary
  }
  return out
}

// Extracts + validates a referral code from raw input — a bare code, or a deep
// link / web URL like `likelabapp://invite/ABC234` or
// `https://likelab.io/invite/ABC234`. Returns the normalised 6-char code, or
// null if it isn't a valid code (only the safe alphabet, exactly 6 chars).
export function parseReferralCode(input: string | null | undefined): string | null {
  if (!input) return null
  let raw = String(input).trim()
  const match = raw.match(/invite\/([^/?#\s]+)/i)
  if (match) raw = match[1]
  raw = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (raw.length !== 6) return null
  for (const ch of raw) {
    if (!ALPHABET.includes(ch)) return null
  }
  return raw
}

// The public invite link for a code. Backend must route this to signup with the
// code pre-filled (see BACKEND TODO in api.ts).
export function referralLink(code: string): string {
  return `https://likelab.io/invite/${code}`
}

// Message used in the native share sheet.
export function buildShareMessage(code: string): string {
  return `Join me on LikeLab — collab with brands and get rewarded as a creator. Use my code ${code} when you sign up: ${referralLink(code)}`
}

export type Milestone = {
  target: number
  // Friends who have joined, capped at the target for display.
  current: number
  // Friends still needed to hit the milestone.
  remaining: number
  // Fill ratio 0..1.
  fraction: number
  // Milestone reached.
  reached: boolean
}

// Progress toward the "invite N friends" reward hook.
export function referralMilestone(joinedCount: number, target = 3): Milestone {
  const joined = Number.isFinite(joinedCount) ? Math.max(0, Math.floor(joinedCount)) : 0
  const current = Math.min(joined, target)
  const remaining = Math.max(0, target - joined)
  const fraction = target > 0 ? Math.min(1, joined / target) : 1
  return { target, current, remaining, fraction, reached: joined >= target }
}
