import { useTheme } from '@/features/core/useTheme'
import { useDeliverablesBadgeCount } from '@/features/deliverables/hooks'
import { FloatingTabBar } from '@/features/navigation/FloatingTabBar'
import { FloatingTabBarVisibilityProvider } from '@/features/navigation/FloatingTabBarVisibility'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { Redirect, withLayoutContext } from 'expo-router'
import { CreatorProfileLiveSync } from '@/features/profile/CreatorProfileLiveSync'
import { WhatsNewHost } from '@/features/whatsnew/WhatsNewModal'
import { LevelUpHost } from '@/features/levelup/LevelUpCelebration'
import { LiveCelebrationHost } from '@/features/deliverables/ui/LiveCelebration'
import { PersistentTabHeader } from '@/features/navigation/PersistentTabHeader'
import { CreatorOnboardingGate } from '@/features/onboarding/CreatorOnboardingGate'
import { ProfileCompletionAutoPrompt } from '@/features/onboarding/ProfileCompletionAutoPrompt'
import { TutorialOverlay } from '@/features/onboarding/TutorialOverlay'
import { WelcomePendingOverlay } from '@/features/onboarding/WelcomePendingOverlay'
import { useCreatorProfile } from '@/features/profile/hooks'
import { useApplicationRealtime } from '@/features/shared/hooks/useApplicationRealtime'
import { useDeliverableRealtime } from '@/features/shared/hooks/useDeliverableRealtime'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
import * as Notifications from 'expo-notifications'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

// Material top tabs give a finger-following pager (the next tab slides in as you
// drag), wired into expo-router via withLayoutContext. The visible bottom bar is
// still our custom FloatingTabBar; tabBarPosition="bottom" just tells the
// navigator where the (overlay) bar lives.
const { Navigator } = createMaterialTopTabNavigator()
const MaterialTopTabs = withLayoutContext(Navigator)

function RealtimeSetup({ userId }: { userId: string }) {
  useApplicationRealtime(userId)
  useDeliverableRealtime(userId)
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
      <View style={{ flex: 1, backgroundColor: palette.bg }}>
        <MaterialTopTabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          tabBarPosition="bottom"
          screenOptions={{ swipeEnabled: true, lazy: false }}
        >
          <MaterialTopTabs.Screen name="overview" options={{ title: 'Discover' }} />
          <MaterialTopTabs.Screen name="deliverables" options={{ title: 'Deliverables' }} />
          <MaterialTopTabs.Screen name="profile" options={{ title: 'Profile' }} />
        </MaterialTopTabs>
        {/* Blur header overlays the pager so content scrolls under the frosted glass */}
        <PersistentTabHeader />
      </View>
      <CreatorOnboardingGate />
      <ProfileCompletionAutoPrompt />
      <WelcomePendingOverlay />
      <TutorialOverlay />
      <WhatsNewHost />
      <LevelUpHost />
      <LiveCelebrationHost />
    </FloatingTabBarVisibilityProvider>
  )
}
