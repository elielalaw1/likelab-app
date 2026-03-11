import { CreatorProfile } from '@/features/core/types'

type ChecklistItem = {
  key: 'avatar_url' | 'age_range' | 'primary_category' | 'gender' | 'country' | 'phone'
  label: string
  done: boolean
}

function filled(value?: string | null) {
  return Boolean(value && value.trim())
}

export function getProfileCompletion(profile?: CreatorProfile | null) {
  const checklist: ChecklistItem[] = [
    { key: 'avatar_url', label: 'Upload profile photo', done: filled(profile?.avatarUrl) },
    { key: 'age_range', label: 'Add your age', done: filled(profile?.ageRange) },
    { key: 'primary_category', label: 'Choose a primary category', done: filled(profile?.primaryCategory) },
    { key: 'gender', label: 'Select your gender', done: filled(profile?.gender) },
    { key: 'country', label: 'Add your country', done: filled(profile?.country) },
    { key: 'phone', label: 'Add phone number', done: filled(profile?.phone) },
  ]

  const completedCount = checklist.filter((item) => item.done).length
  const percentage = Math.round((completedCount / checklist.length) * 100)

  return {
    checklist,
    completedCount,
    totalCount: checklist.length,
    percentage,
    isComplete: completedCount === checklist.length,
  }
}

