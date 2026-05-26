type PendingAuth = {
  email: string
  password: string
  phone?: string | null
  gender?: string | null
  age?: string | null
  country?: string | null
  primaryCategory?: string | null
  address?: string | null
  postalCode?: string | null
  county?: string | null
  city?: string | null
}

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
