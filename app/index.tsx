import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { AppLoadingScreen } from '@/features/shared/components/AppLoadingScreen'

const MIN_SPLASH_MS = 4200

export default function IndexPage() {
  const { session, loading } = useAuthSession()
  const [minDelayDone, setMinDelayDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  if (loading || !minDelayDone) return <AppLoadingScreen />

  return <Redirect href={session ? '/(tabs)/overview' : '/login'} />
}
