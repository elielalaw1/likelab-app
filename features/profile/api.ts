import { supabase } from '@/lib/supabase'
import { CreatorProfile } from '@/features/core/types'
import { getCurrentUserId, textValue } from '@/features/core/supabase-utils'

type Row = Record<string, unknown>

function completionPercentage(row: Row) {
  const requiredKeys = ['avatar_url', 'age_range', 'primary_category', 'gender', 'country', 'phone']
  const filled = requiredKeys.reduce((acc, key) => {
    const value = row[key]
    return typeof value === 'string' && value.trim() ? acc + 1 : acc
  }, 0)

  return Math.round((filled / requiredKeys.length) * 100)
}

function mapProfile(creator: Row, profile: Row, userId: string): CreatorProfile {
  const reviewStatus = textValue(creator, ['review_status'])
  const displayName = textValue(creator, ['display_name']) || textValue(profile, ['display_name', 'full_name'])

  return {
    id: userId,
    email: textValue(profile, ['email']),
    displayName,
    phoneCountryCode: textValue(creator, ['phone_country_code']),
    phone: textValue(creator, ['phone']),
    tiktokHandle: textValue(creator, ['tiktok_handle']),
    instagramHandle: textValue(creator, ['instagram_handle']),
    gender: textValue(creator, ['gender']),
    ageRange: textValue(creator, ['age_range']),
    country: textValue(creator, ['country']),
    county: textValue(creator, ['county']),
    city: textValue(creator, ['city']),
    primaryCategory: textValue(creator, ['primary_category']),
    secondaryCategory: textValue(creator, ['secondary_category']),
    avatarUrl: textValue(creator, ['avatar_url']),
    reviewStatus,
    completionPercentage: completionPercentage(creator),
    approved: reviewStatus === 'approved',
  }
}

export async function getCreatorProfile() {
  const userId = await getCurrentUserId()

  const [creatorRes, profileRes, authRes] = await Promise.all([
    supabase.from('creator_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (creatorRes.error) throw new Error(creatorRes.error.message)

  const creator = (creatorRes.data || {}) as Row
  const profile = (profileRes.data || {}) as Row
  const authEmail = authRes.data.user?.email || null

  const mapped = mapProfile(creator, profile, userId)
  return {
    ...mapped,
    email: mapped.email || authEmail,
  }
}

export async function updateCreatorProfile(values: Partial<CreatorProfile>) {
  const userId = await getCurrentUserId()

  const payload = {
    user_id: userId,
    display_name: values.displayName,
    phone: values.phone,
    tiktok_handle: values.tiktokHandle,
    instagram_handle: values.instagramHandle,
    gender: values.gender,
    age_range: values.ageRange,
    country: values.country,
    county: values.county,
    city: values.city,
    primary_category: values.primaryCategory,
    secondary_category: values.secondaryCategory,
    avatar_url: values.avatarUrl,
  }

  const { error } = await supabase.from('creator_profiles').upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export function isProfileComplete(profile: CreatorProfile) {
  return profile.completionPercentage === 100
}
