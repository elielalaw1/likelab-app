import { Redirect, Tabs } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import { colors, palette } from '@/features/core/theme'
import { getCampaigns } from '@/features/campaigns/api'
import { getApplications } from '@/features/applications/api'
import { getDeliverables } from '@/features/deliverables/api'
import { getCreatorProfile } from '@/features/profile/api'
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar'
import { FloatingTabBarVisibilityProvider } from '@/features/navigation/FloatingTabBarVisibility'
import { CreatorProfileLiveSync } from '@/features/profile/CreatorProfileLiveSync'

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
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: palette.bg },
        }}
      >
        <Tabs.Screen name="overview" options={{ title: 'Home' }} />
        <Tabs.Screen name="campaigns" options={{ title: 'Campaigns' }} />
        <Tabs.Screen name="applications" options={{ title: 'Applications' }} />
        <Tabs.Screen name="deliverables" options={{ title: 'Deliverables' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </FloatingTabBarVisibilityProvider>
  )
}
