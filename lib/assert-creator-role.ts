import { supabase } from '@/lib/supabase'

const NON_CREATOR_MESSAGE =
  'This app is for creators only. Brands can sign in at likelab.io.'

/**
 * Returns true if the user has the 'creator' role.
 * On any DB error, signs the user out and returns false (fail-safe).
 */
export async function assertCreatorRole(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (error) {
      // Network/DB error — don't sign out, assume still valid to avoid false logouts
      return true
    }

    const isCreator = Array.isArray(data) && data.some((r) => r.role === 'creator')

    if (!isCreator) {
      await supabase.auth.signOut()
      return false
    }

    return true
  } catch {
    // Don't sign out on unexpected errors — assume still valid
    return true
  }
}

export { NON_CREATOR_MESSAGE }
