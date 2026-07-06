import { CreatorProfile } from '@/features/core/types'

export type ProfileCompletionSection = 'avatar' | 'personal' | 'categories' | 'location' | 'account' | 'shipping'

export type ProfileCompletionItem = {
  key: 'avatar_url' | 'age_range' | 'primary_category' | 'gender' | 'country' | 'city' | 'address' | 'postal_code' | 'first_name' | 'last_name'
  label: string
  done: boolean
  section: ProfileCompletionSection
}

function filled(value?: string | null) {
  return Boolean(value && value.trim())
}

export function getProfileCompletion(profile?: CreatorProfile | null) {
  const checklist: ProfileCompletionItem[] = [
    { key: 'avatar_url', label: 'Upload profile photo', done: filled(profile?.avatarUrl), section: 'avatar' },
    { key: 'first_name', label: 'Add your first name', done: filled(profile?.firstName), section: 'personal' },
    { key: 'last_name', label: 'Add your last name', done: filled(profile?.lastName), section: 'personal' },
    { key: 'age_range', label: 'Add your age', done: filled(profile?.ageRange), section: 'personal' },
    { key: 'primary_category', label: 'Choose a primary category', done: filled(profile?.primaryCategory), section: 'categories' },
    { key: 'gender', label: 'Select your gender', done: filled(profile?.gender), section: 'personal' },
    { key: 'country', label: 'Add your country', done: filled(profile?.country), section: 'location' },
    { key: 'city', label: 'Add your city', done: filled(profile?.city), section: 'location' },
    { key: 'address', label: 'Add your street address', done: filled(profile?.address), section: 'shipping' },
    { key: 'postal_code', label: 'Add your postal code', done: filled(profile?.postalCode), section: 'shipping' },
  ]

  const completedCount = checklist.filter((item) => item.done).length
  const percentage = Math.round((completedCount / checklist.length) * 100)

  return {
    checklist,
    completedCount,
    totalCount: checklist.length,
    percentage,
    isComplete: completedCount === checklist.length,
    nextIncompleteSection: checklist.find((item) => !item.done)?.section ?? null,
  }
}
