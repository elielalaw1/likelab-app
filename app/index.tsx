import { Redirect } from 'expo-router'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

export default function IndexPage() {
  const { session, loading } = useAuthSession()

  if (loading) return null

  // Unauthenticated users land on the value-first welcome carousel (which funnels
  // into signup) rather than the login dead-end — new creators are the majority of
  // first opens, and sending them straight to a sign-in form hurts activation.
  // Returning users still reach login via "Already have an account? Sign in".
  return <Redirect href={session ? '/(tabs)/overview' : '/welcome'} />
}
