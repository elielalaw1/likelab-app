import { useEffect, useRef } from 'react'
import { router } from 'expo-router'
import { useCreatorProfile } from '@/features/profile/hooks'
import { getProfileCompletion } from '@/features/profile/completion'
import { getCreatorReviewStatus } from '@/features/onboarding/useCreatorReviewStatus'
import { isCompletionPromptDismissed } from '@/features/onboarding/completionPromptControl'

// Auto-presents the profile-completion flow once per app session for an approved,
// TikTok-connected creator who still has missing profile fields (typically an older
// account created before a field became required). "Later" sets the session flag;
// a cold start clears it, so it re-prompts on each app open until the profile is 100%.
export function ProfileCompletionAutoPrompt() {
  const { data: profile, isFetched } = useCreatorProfile()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (!isFetched || !profile) return
    // Only after the earlier gates are satisfied — don't stack on top of the
    // connect-TikTok or pending-review states.
    if (!profile.tiktokConnected) return
    if (getCreatorReviewStatus(profile) !== 'approved') return
    if (getProfileCompletion(profile).isComplete) return
    if (isCompletionPromptDismissed()) return

    fired.current = true
    // Small delay so first-run overlays (tutorial/welcome) settle and the navigator
    // is fully ready before we present the flow.
    const t = setTimeout(() => router.push('/complete-profile'), 900)
    return () => clearTimeout(t)
  }, [profile, isFetched])

  return null
}
