import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/lib/supabase'

const NON_CREATOR_MESSAGE =
  'This app is for creators only. Brands can sign in at likelab.io.'

const CREATOR_ROLE_CACHE_KEY = 'likelab_creator_role_v1'

export async function clearCreatorRoleCache(): Promise<void> {
  await SecureStore.deleteItemAsync(CREATOR_ROLE_CACHE_KEY).catch(() => {})
}

export async function assertCreatorRole(userId: string): Promise<boolean> {
  try {
    // Use cached result to avoid a blocking DB query on every boot
    const cached = await SecureStore.getItemAsync(CREATOR_ROLE_CACHE_KEY).catch(() => null)
    if (cached === userId) return true

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (error) return true

    // Empty array = RLS blocking or timing issue — fail open, never log out a valid user
    if (!Array.isArray(data) || data.length === 0) return true

    // We have rows — only sign out if we positively confirm there's no creator role
    if (data.some((r) => r.role === 'creator')) {
      await SecureStore.setItemAsync(CREATOR_ROLE_CACHE_KEY, userId).catch(() => {})
      return true
    }

    await supabase.auth.signOut()
    return false
  } catch {
    return true
  }
}

export { NON_CREATOR_MESSAGE }
