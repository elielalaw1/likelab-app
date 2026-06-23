import { useTheme } from '@/features/core/useTheme'
import { useDeliverablesBadgeCount } from '@/features/deliverables/hooks'
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar'
import { FloatingTabBarVisibilityProvider } from '@/features/navigation/FloatingTabBarVisibility'
import { CreatorProfileLiveSync } from '@/features/profile/CreatorProfileLiveSync'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'
import { TutorialOverlay } from '@/features/onboarding/TutorialOverlay'
import { WelcomePendingOverlay } from '@/features/onboarding/WelcomePendingOverlay'
import { useCreatorProfile } from '@/features/profile/hooks'
import { useApplicationRealtime } from '@/features/shared/hooks/useApplicationRealtime'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import * as Notifications from 'expo-notifications'
import { Redirect, Tabs } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

function RealtimeSetup({ userId }: { userId: string }) {
  useApplicationRealtime(userId)
  return null
}

function BadgeSync() {
  const count = useDeliverablesBadgeCount()
  useEffect(() => {
    Notifications.setBadgeCountAsync(count).catch(() => {})
  }, [count])
  return null
}

function TikTokGuard() {
  const { data: profile, isFetched } = useCreatorProfile()
  if (isFetched && profile && !profile.tiktokConnected) {
    return <Redirect href="/connect-tiktok" />
  }
  return null
}

export default function TabsLayout() {
  const { colors, palette } = useTheme()
  const { session, loading } = useAuthSession()

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
      <TikTokGuard />
      <CreatorProfileLiveSync userId={session.user.id} />
      <RealtimeSetup userId={session.user.id} />
      <BadgeSync />
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: palette.bg },
        }}
      >
        <Tabs.Screen name="overview" options={{ title: 'Discover' }} />
        <Tabs.Screen name="campaigns" options={{ href: null }} />
        <Tabs.Screen name="applications" options={{ href: null }} />
        <Tabs.Screen name="deliverables" options={{ title: 'Deliverables' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
      <CreatorOnboardingGate />
      <WelcomePendingOverlay />
      <TutorialOverlay />
    </FloatingTabBarVisibilityProvider>
  )
}
