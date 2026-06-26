import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { redeemPendingReferral, setPendingReferralCode } from '@/features/referral/redeem'

// Mounted once at the app root. Captures an incoming referral code from the
// launch URL / subsequent deep links, then redeems it as soon as a session
// exists (covers email-OTP and OAuth signups, idempotent on the backend).
export function ReferralLinkHandler() {
  useEffect(() => {
    const tryRedeem = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) void redeemPendingReferral(data.user.id)
    }

    // 1) Capture the code from the cold-start URL + any links while running.
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          setPendingReferralCode(url)
          void tryRedeem()
        }
      })
      .catch(() => {})

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      setPendingReferralCode(url)
      void tryRedeem()
    })

    // 2) Redeem on the current session + on any future sign-in.
    void tryRedeem()
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void redeemPendingReferral(session.user.id)
    })

    return () => {
      linkSub.remove()
      authSub.subscription.unsubscribe()
    }
  }, [])

  return null
}
