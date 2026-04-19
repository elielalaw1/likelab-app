import { getApplications } from '@/features/applications/api'
import { getCampaigns } from '@/features/campaigns/api'
import { colors, palette } from '@/features/core/theme'
import { getDeliverables } from '@/features/deliverables/api'
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar'
import { FloatingTabBarVisibilityProvider } from '@/features/navigation/FloatingTabBarVisibility'
import { getCreatorProfile } from '@/features/profile/api'
import { CreatorProfileLiveSync } from '@/features/profile/CreatorProfileLiveSync'
import { ProfileGate } from '@/features/profile/ui/ProfileGate'
import { ProfilePendingGate } from '@/features/profile/ui/ProfilePendingGate'
import { useApplicationRealtime } from '@/features/shared/hooks/useApplicationRealtime'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { useQueryClient } from '@tanstack/react-query'
import { Redirect, Tabs } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

function RealtimeSetup({ userId }: { userId: string }) {
  useApplicationRealtime(userId)
  return null
}

export default function TabsLayout() {
  const { session, loading } = useAuthSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!session) return

    queryClient.prefetchQuery({ queryKey: ['campaigns'], queryFn: getCampaigns })
    queryClient.prefetchQuery({ queryKey: ['applications'], queryFn: getApplications })
    queryClient.prefetchQuery({ queryKey: ['deliverables'], queryFn: getDeliverables })
    queryClient.prefetchQuery({ queryKey: ['creator-profile'], queryFn: getCreatorProfile })
  }, [session, queryClient])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  return (
    <FloatingTabBarVisibilityProvider>
      <CreatorProfileLiveSync userId={session.user.id} />
      <RealtimeSetup userId={session.user.id} />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: palette.bg },
        }}
      >
        <Tabs.Screen name="overview" options={{ title: 'Home' }} />
        <Tabs.Screen name="campaigns" options={{ href: null }} />
        <Tabs.Screen name="applications" options={{ href: null }} />
        <Tabs.Screen name="deliverables" options={{ title: 'Deliverables' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
      <ProfileGate userId={session.user.id} />
      <ProfilePendingGate userId={session.user.id} />
    </FloatingTabBarVisibilityProvider>
  )
}
