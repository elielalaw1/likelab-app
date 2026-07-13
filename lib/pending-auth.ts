import * as SecureStore from 'expo-secure-store'

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

const KEY = 'pending-auth'

// Keychain-backed (not an in-memory JS variable) so the credentials survive an
// iOS memory kill during the signup -> read-email -> OTP round-trip. Without this,
// killing the app mid-flow strands the user: the account already exists server-side
// but there is no password left to sign them in with once they return.
export async function setPendingAuth(auth: PendingAuth): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(auth))
}

/** Reads and immediately clears the pending credentials — call once, in verify-otp on mount. */
export async function consumePendingAuth(): Promise<PendingAuth | null> {
  const raw = await SecureStore.getItemAsync(KEY)
  if (!raw) return null
  await SecureStore.deleteItemAsync(KEY)
  try {
    return JSON.parse(raw) as PendingAuth
  } catch {
    return null
  }
}
