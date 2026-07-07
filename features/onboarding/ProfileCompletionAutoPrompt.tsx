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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Bail if we've already presented, or a timer is already armed — the profile
    // object changes identity on every refetch (e.g. a realtime TikTok-stats
    // update), and re-arming/clearing here would silently cancel the pending prompt.
    if (fired.current || timerRef.current) return
    if (!isFetched || !profile) return
    // Only after the earlier gates are satisfied — don't stack on top of the
    // connect-TikTok or pending-review states.
    if (!profile.tiktokConnected) return
    if (getCreatorReviewStatus(profile) !== 'approved') return
    if (getProfileCompletion(profile).isComplete) return
    if (isCompletionPromptDismissed()) return

    // Small delay so first-run overlays (tutorial/welcome) settle and the navigator
    // is fully ready before we present the flow. Kept in a ref so a refetch within
    // the window doesn't cancel it.
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      fired.current = true
      router.push('/complete-profile')
    }, 900)
  }, [profile, isFetched])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return null
}
