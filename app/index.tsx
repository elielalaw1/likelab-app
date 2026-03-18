import { Redirect } from 'expo-router'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

export default function IndexPage() {
  const { session, loading } = useAuthSession()

  if (loading) return null

  return <Redirect href={session ? '/(tabs)/overview' : '/login'} />
}
