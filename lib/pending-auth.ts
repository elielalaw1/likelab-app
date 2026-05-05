type PendingAuth = { email: string; password: string }

let _pending: PendingAuth | null = null

export function setPendingAuth(auth: PendingAuth): void {
  _pending = auth
}

/** Reads and immediately clears the pending credentials — call once, in verify-otp on mount. */
export function consumePendingAuth(): PendingAuth | null {
  const auth = _pending
  _pending = null
  return auth
}
