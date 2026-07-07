import { useEffect } from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { setPendingReferralCode } from '@/features/referral/redeem'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

// Deep / universal link target for https://likelab.io/invite/<CODE> and
// likelabapp://invite/<CODE>. Captures the referral code, then bounces to signup
// (or straight into the app when already signed in) — the code is redeemed once
// the new account authenticates (see features/referral/redeem.ts).
export default function InviteRedirectPage() {
  const { code } = useLocalSearchParams<{ code?: string }>()
  const { session, loading } = useAuthSession()

  useEffect(() => {
    // Only stash the code for a logged-out visitor — an already-signed-in user isn't
    // redeeming a fresh invite, and capturing it would wrongly refer their account.
    if (code && !loading && !session) setPendingReferralCode(code)
  }, [code, loading, session])

  if (loading) return null

  return <Redirect href={session ? '/(tabs)/overview' : '/signup'} />
}
