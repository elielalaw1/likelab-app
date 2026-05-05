import { supabase } from '@/lib/supabase'
import { CreatorProfile } from '@/features/core/types'
import { getCurrentUserId, textValue } from '@/features/core/supabase-utils'
import { PHONE_CODE_OPTIONS } from '@/features/profile/location-data'
import { getProfileCompletion } from '@/features/profile/completion'

type Row = Record<string, unknown>
const stripHandle = (value?: string | null) => {
  const normalized = value?.trim().replace(/^@+/, '')
  return normalized ? normalized : null
}
const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

function toStatString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

function mapProfileConstraintError(message: string) {
  if (message.includes('unique_creator_phone')) {
    return 'This phone number is already in use by another account'
  }
  if (message.includes('unique_tiktok_handle')) {
    return 'This TikTok handle is already registered'
  }
  if (message.includes('unique_instagram_handle')) {
    return 'This Instagram handle is already registered'
  }
  return message
}

function inferPhoneCountryCode(phone?: string | null) {
  const normalized = typeof phone === 'string' ? phone.trim() : ''
  if (!normalized) return null

  const matches = PHONE_CODE_OPTIONS
    .map((option) => option.value)
    .filter((code) => normalized.startsWith(code))
    .sort((a, b) => b.length - a.length)

  return matches[0] || null
}

function completionPercentage(row: Row) {
  const requiredKeys = ['avatar_url', 'age_range', 'primary_category', 'gender', 'country', 'phone', 'address', 'postal_code']
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
    phoneCountryCode: inferPhoneCountryCode(textValue(creator, ['phone'])),
    phone: textValue(creator, ['phone']),
    tiktokHandle: textValue(creator, ['tiktok_handle']),
    instagramHandle: textValue(creator, ['instagram_handle']),
    gender: textValue(creator, ['gender']),
    ageRange: textValue(creator, ['age_range']),
    country: textValue(creator, ['country']),
    county: textValue(creator, ['county']),
    city: textValue(creator, ['city']),
    address: textValue(creator, ['address']),
    postalCode: textValue(creator, ['postal_code']),
    primaryCategory: textValue(creator, ['primary_category']),
    secondaryCategory: textValue(creator, ['secondary_category']),
    avatarUrl: textValue(creator, ['avatar_url']),
    reviewStatus,
    completionPercentage: completionPercentage(creator),
    approved: reviewStatus === 'approved',
    tiktokFollowers: toStatString(creator['followers']),
    tiktokLikes: toStatString(creator['likes']),
    tiktokViews: toStatString(creator['views']),
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

  const payload: Record<string, unknown> = { user_id: userId }

  if (hasOwn(values, 'displayName')) payload.display_name = values.displayName ?? null
  if (hasOwn(values, 'phone')) payload.phone = values.phone ?? null
  if (hasOwn(values, 'tiktokHandle')) payload.tiktok_handle = stripHandle(values.tiktokHandle)
  if (hasOwn(values, 'instagramHandle')) payload.instagram_handle = stripHandle(values.instagramHandle)
  if (hasOwn(values, 'gender')) payload.gender = values.gender ?? null
  if (hasOwn(values, 'ageRange')) payload.age_range = values.ageRange ?? null
  if (hasOwn(values, 'country')) payload.country = values.country ?? null
  if (hasOwn(values, 'county')) payload.county = values.county ?? null
  if (hasOwn(values, 'city')) payload.city = values.city ?? null
  if (hasOwn(values, 'address')) payload.address = values.address ?? null
  if (hasOwn(values, 'postalCode')) payload.postal_code = values.postalCode ?? null
  if (hasOwn(values, 'primaryCategory')) payload.primary_category = values.primaryCategory ?? null
  if (hasOwn(values, 'secondaryCategory')) payload.secondary_category = values.secondaryCategory ?? null
  if (hasOwn(values, 'avatarUrl')) payload.avatar_url = values.avatarUrl ?? null

  // Avoid no-op upserts that can create/alter rows unintentionally.
  if (Object.keys(payload).length === 1) return

  const { error } = await supabase.from('creator_profiles').upsert(payload, { onConflict: 'user_id' })
  if (error) throw new Error(mapProfileConstraintError(error.message))
}

export function isProfileComplete(profile: CreatorProfile) {
  return getProfileCompletion(profile).isComplete
}
