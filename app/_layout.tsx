import { Stack, router } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useEffect, useRef } from 'react'
import { Alert, View } from 'react-native'
import { useFonts } from 'expo-font'
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat'
import * as SplashScreen from 'expo-splash-screen'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { NotificationsProvider } from '@/features/notifications/hooks'
import { ToastContainer, toast } from '@/features/shared/ui/Toast'
import { registerForPushNotificationsAsync, savePushToken } from '@/features/notifications/push'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
SplashScreen.preventAutoHideAsync()

const ALLOWED_NOTIFICATION_ROUTES = [
  /^\/\(tabs\)\/(overview|applications|deliverables)(\?.*)?$/,
  /^\/campaigns\/[a-zA-Z0-9_-]+(\?.*)?$/,
  /^\/settings(\?.*)?$/,
]

function isAllowedNotificationLink(link: string): boolean {
  return ALLOWED_NOTIFICATION_ROUTES.some((pattern) => pattern.test(link))
}

function resolveNotificationRoute(data: Record<string, unknown>): string | null {
  const link = data?.link
  if (typeof link === 'string' && isAllowedNotificationLink(link)) return link

  const type = data?.type as string | undefined
  const campaignId = data?.campaign_id as string | undefined
  const campaignRoute = campaignId ? `/campaigns/${campaignId}` : null
  const campaignVideosRoute = campaignId ? `/campaigns/${campaignId}?tab=videos` : null

  switch (type) {
    case 'new_campaign':
    case 'campaign_invitation':
    case 'application_accepted':
    case 'campaign_deadline_reminder':
      return campaignRoute
    case 'application_rejected':
      return '/(tabs)/applications'
    case 'creator_approved':
      return '/(tabs)/overview'
    case 'deliverable_assigned':
    case 'deliverable_revision':
    case 'deliverable_approved':
      return campaignVideosRoute ?? campaignRoute
    default:
      return null
  }
}

const NOTIF_EXPLAIN_KEY = 'notif_explain_shown_v1'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function PushNotificationSetup() {
  const { session } = useAuthSession()
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null)
  const foregroundListener = useRef<Notifications.EventSubscription | null>(null)
  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return

    const setupPush = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()

      if (existingStatus === 'granted') {
        const token = await registerForPushNotificationsAsync()
        if (token) savePushToken(token, userId)
        return
      }

      const alreadyShown = await SecureStore.getItemAsync(NOTIF_EXPLAIN_KEY).catch(() => null)
      if (!alreadyShown) {
        await SecureStore.setItemAsync(NOTIF_EXPLAIN_KEY, '1').catch(() => {})
        Alert.alert(
          'Notifications',
          'We\'ll only notify you about updates to your collaborations — no spam.',
          [{
            text: 'OK',
            onPress: async () => {
              const token = await registerForPushNotificationsAsync()
              if (token) savePushToken(token, userId)
            },
          }]
        )
      } else {
        const token = await registerForPushNotificationsAsync()
        if (token) savePushToken(token, userId)
      }
    }

    void setupPush()

    // Foreground: show in-app toast when notification arrives while app is open
    foregroundListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content
      if (title) toast.info(`${title}${body ? `\n${body}` : ''}`)
    })

    // Background/closed: track open + navigate to route on tap
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>

      // Fire-and-forget open tracking for analytics
      const batchId = data?.batch_id
      if (typeof batchId === 'string' && userId) {
        fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/track-push-open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_id: batchId, user_id: userId }),
        }).catch(() => {})
      }

      const route = resolveNotificationRoute(data)
      if (route) router.push(route as never)
    })

    return () => {
      foregroundListener.current?.remove()
      foregroundListener.current = null
      notificationResponseListener.current?.remove()
      notificationResponseListener.current = null
    }
  }, [userId])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat: Montserrat_400Regular,
    'Montserrat-Medium': Montserrat_500Medium,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
  })
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <PushNotificationSetup />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="campaigns/[id]" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="verify-otp" />
          </Stack>
          <ToastContainer />
        </View>
      </NotificationsProvider>
    </QueryClientProvider>
  )
}
