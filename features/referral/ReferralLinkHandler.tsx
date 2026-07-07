import { useEffect } from 'react'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { captureClipboardReferralCode, redeemPendingReferral, setPendingReferralCode } from '@/features/referral/redeem'

// Mounted once at the app root. Captures an incoming referral code from the
// launch URL / subsequent deep links (and, for fresh installs, the clipboard
// bridge), then redeems it as soon as a session exists (covers email-OTP and
// OAuth signups, idempotent on the backend).
export function ReferralLinkHandler() {
  useEffect(() => {
    const tryRedeem = async () => {
      // Fresh-install bridge: pull a code the web fallback left on the clipboard
      // before we look for a session. No-op after the first launch / when a URL
      // already supplied the code.
      await captureClipboardReferralCode()
      const { data } = await supabase.auth.getUser()
      if (data.user) void redeemPendingReferral(data.user.id)
    }

    // Only capture an invite code for a logged-OUT visitor. An already-signed-in
    // creator tapping an invite link is NOT a fresh invitee — storing + redeeming
    // it would wrongly record their established account as referred (same reasoning
    // as the clipboard guard in redeem.ts).
    const captureIfLoggedOut = async (url: string) => {
      const { data } = await supabase.auth.getSession()
      if (data.session) return
      setPendingReferralCode(url)
      void tryRedeem()
    }

    // 1) Capture the code from the cold-start URL + any links while running.
    Linking.getInitialURL()
      .then((url) => {
        if (url) void captureIfLoggedOut(url)
      })
      .catch(() => {})

    const linkSub = Linking.addEventListener('url', ({ url }) => {
      void captureIfLoggedOut(url)
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
