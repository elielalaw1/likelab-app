import { Stack, router } from 'expo-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { queryClient } from '@/lib/query-client'
import { useEffect, useRef, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { useFonts } from 'expo-font'
import {
  Montserrat_300Light,
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
import { TikTokAuthGuard } from '@/features/auth/TikTokAuthGuard'
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

const NOTIF_EXPLAIN_KEY = 'notif_explain_shown_v2'

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
          'Stay in the loop 🔔',
          'We\'ll only notify you when a brand accepts you, assigns you a collab, or approves your content. No ads, no spam — ever.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Turn on notifications',
              onPress: async () => {
                const token = await registerForPushNotificationsAsync()
                if (token) savePushToken(token, userId)
              },
            },
          ]
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

const KILLSWITCH_GIST_API = 'https://api.github.com/gists/9f23eb439b9a2edf58e812d3c9e0f9f4'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat: Montserrat_400Regular,
    'Montserrat-Light': Montserrat_300Light,
    'Montserrat-Medium': Montserrat_500Medium,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
  })
  const [killswitch, setKillswitch] = useState<{ blocked: boolean; message: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    fetch(KILLSWITCH_GIST_API, { signal: controller.signal, headers: { 'Accept': 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((gist) => {
        clearTimeout(timeout)
        const content = gist?.files?.['likelab-config.json']?.content
        const data = content ? JSON.parse(content) : { active: true }
        if (data.active === false) {
          setKillswitch({ blocked: true, message: data.message || 'Tillfälligt otillgänglig.' })
        } else {
          setKillswitch({ blocked: false, message: '' })
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        setKillswitch({ blocked: true, message: 'Kunde inte ansluta till tjänsten.' })
      })
  }, [])

  useEffect(() => {
    if (fontsLoaded && killswitch !== null) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, killswitch])

  if (!fontsLoaded || killswitch === null) {
    return null
  }

  if (killswitch.blocked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', textAlign: 'center', padding: 32, fontSize: 16 }}>
          {killswitch.message}
        </Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <NotificationsProvider>
              <PushNotificationSetup />
              <TikTokAuthGuard />
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
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
