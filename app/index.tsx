import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

export default function IndexPage() {
  const { session, loading } = useAuthSession()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return <Redirect href={session ? '/(tabs)/overview' : '/login'} />
}
