// Supabase Auth's raw error messages are technical and inconsistent ("Invalid
// login credentials", "AuthRetryableFetchError: Network request failed", ...) —
// this maps the common ones to copy a creator can actually act on. Unmatched
// errors fall back to a generic line rather than ever showing raw text.
const PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Please verify your email before signing in.'],
  [/already registered/i, 'An account with this email already exists.'],
  [/token.*(expired|invalid)|otp.*(expired|invalid)/i, 'That code is invalid or has expired — request a new one.'],
  [/rate limit|only request this once/i, 'Too many attempts — please wait a moment and try again.'],
  [/user not found/i, 'No account found with that email.'],
  [/network|fetch failed|failed to fetch/i, 'Network problem — check your connection and try again.'],
]

export function friendlyAuthError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  for (const [pattern, friendly] of PATTERNS) {
    if (pattern.test(message)) return friendly
  }
  return fallback
}
