import * as ImagePicker from 'expo-image-picker'
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
  // Live keeps a max-3-accounts-per-phone rule (the enforce_creator_phone_limit
  // trigger), not a hard UNIQUE — its error carries the PHONE_LIMIT_REACHED tag.
  if (message.includes('PHONE_LIMIT_REACHED')) {
    return 'This phone number has reached its limit of 3 accounts.'
  }
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

// Phone is optional, so it is intentionally excluded here. Keep this list in
// sync with the checklist keys in getProfileCompletion so the percentage and
// the "complete" check agree (a profile with everything but a phone hits 100%).
const COMPLETION_KEYS = ['avatar_url', 'first_name', 'last_name', 'age_range', 'primary_category', 'gender', 'country', 'city', 'address', 'postal_code']

function completionPercentage(row: Row) {
  const filled = COMPLETION_KEYS.reduce((acc, key) => {
    const value = row[key]
    return typeof value === 'string' && value.trim() ? acc + 1 : acc
  }, 0)

  return Math.round((filled / COMPLETION_KEYS.length) * 100)
}

function mapProfile(creator: Row, profile: Row, userId: string): CreatorProfile {
  const reviewStatus = textValue(creator, ['review_status'])
  const displayName = textValue(creator, ['display_name']) || textValue(profile, ['display_name', 'full_name'])

  return {
    id: userId,
    email: textValue(profile, ['email']),
    displayName,
    // Real columns only — no display_name fallback here, so the completion check
    // treats older name-only accounts as "missing" and re-prompts them to split it.
    firstName: textValue(creator, ['first_name']),
    lastName: textValue(creator, ['last_name']),
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
    tiktokFollowers: toStatString(creator['tiktok_follower_count'] ?? creator['followers']),
    tiktokLikes: toStatString(creator['tiktok_likes_count'] ?? creator['likes']),
    tiktokViews: toStatString(creator['views']),
    tiktokConnected: creator['tiktok_connected'] === true || Boolean(creator['tiktok_open_id']),
    tiktokOpenId: textValue(creator, ['tiktok_open_id']),
    tiktokProfileUrl: textValue(creator, ['tiktok_profile_url', 'tiktok_profile_deep_link']),
    tiktokBio: textValue(creator, ['tiktok_bio']),
    tiktokVerified: creator['tiktok_verified'] === true,
    tiktokVideoCount: toStatString(creator['tiktok_video_count']),
    tiktokFollowing: toStatString(creator['tiktok_following_count']),
    tiktokUsername: textValue(creator, ['tiktok_username']),
    tiktokDisplayName: textValue(creator, ['tiktok_display_name']),
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
  if (hasOwn(values, 'firstName')) payload.first_name = values.firstName ?? null
  if (hasOwn(values, 'lastName')) payload.last_name = values.lastName ?? null
  // Keep the legacy concatenated display_name in sync whenever either name part is
  // set, so brand/admin surfaces that still read display_name stay correct.
  if ((hasOwn(values, 'firstName') || hasOwn(values, 'lastName')) && !hasOwn(values, 'displayName')) {
    payload.display_name = `${values.firstName ?? ''} ${values.lastName ?? ''}`.trim() || null
  }
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

  // Ask for the written row back so a silently-blocked write is caught. When an RLS
  // UPDATE policy filters out the row the upsert affects 0 rows and returns NO error
  // (data: null) — without this check the profile-completion flow would "succeed",
  // persist nothing, and re-prompt forever.
  const { data, error } = await supabase
    .from('creator_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id')
    .maybeSingle()
  if (error) throw new Error(mapProfileConstraintError(error.message))
  if (!data) throw new Error('We could not save your changes. You may not have permission to edit this profile — please sign out and back in, or contact support.')
}

// Pick an image from the library and upload it to the avatars bucket, returning a
// cache-busted public URL (or null if the user cancelled). Shared by Settings and
// the profile-completion flow so the upload logic lives in one place. Throws on
// permission denial or a storage error so the caller can surface a message.
export async function uploadAvatarFromLibrary(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new Error('Allow photo library access to upload a profile photo.')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  })
  if (result.canceled || !result.assets[0]?.uri) return null

  const asset = result.assets[0]
  const uri = asset.uri
  const extFromMime = asset.mimeType?.split('/')[1]
  const ext = (extFromMime || uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase()
  const contentType = asset.mimeType || `image/${ext}`
  const path = `${userId}/avatar.${ext}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()
  const { error } = await supabase.storage.from('avatars').upload(path, arrayBuffer, { upsert: true, contentType })
  if (error) throw error

  const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  return `${publicUrl}?t=${Date.now()}`
}

export function isProfileComplete(profile: CreatorProfile) {
  return getProfileCompletion(profile).isComplete
}

export type CreatorLevel = { xp: number; level: number }

// The creator's real account-wide XP + level, read from the backend `creator_levels`
// view (RLS: the creator sees only their own row; brands see nothing). No row yet
// (no XP events) → level 1, 0 XP.
export async function getCreatorLevel(): Promise<CreatorLevel> {
  const userId = await getCurrentUserId()
  if (!userId) return { xp: 0, level: 1 }
  const { data, error } = await supabase
    .from('creator_levels')
    .select('xp, level')
    .eq('creator_id', userId)
    .maybeSingle()
  // Throw on a real query failure so React Query retries and keeps the last good
  // cache (via placeholderData) instead of caching a fake {level:1}, which would
  // both show a wrong tier and trip LevelUpHost into a bogus level-up celebration.
  // Only a genuinely absent row (no XP yet) yields the level-1 baseline.
  if (error) throw new Error(error.message)
  if (!data) return { xp: 0, level: 1 }
  return { xp: Number(data.xp) || 0, level: Number(data.level) || 1 }
}
