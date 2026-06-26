import { Stack, router } from 'expo-router'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
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
import { TikTokAuthGuard } from '@/features/auth/TikTokAuthGuard'
import { ReconnectAutoRoute } from '@/features/auth/ReconnectAutoRoute'
import { ReferralLinkHandler } from '@/features/referral/ReferralLinkHandler'
import { ToastContainer, toast } from '@/features/shared/ui/Toast'
import { ErrorBoundary } from '@/features/shared/ui/ErrorBoundary'
import { OfflineBanner } from '@/features/shared/ui/OfflineBanner'
import { registerForPushNotificationsAsync, savePushToken } from '@/features/notifications/push'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
SplashScreen.preventAutoHideAsync()

const ALLOWED_NOTIFICATION_ROUTES = [
  /^\/\(tabs\)\/(overview|deliverables)(\?.*)?$/,
  /^\/applications(\?.*)?$/,
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
    case 'campaign_phase_change':
      return campaignRoute
    case 'application_rejected':
      return '/applications'
    case 'creator_approved':
      return '/(tabs)/overview'
    case 'deliverable_assigned':
    case 'deliverable_revision':
    case 'deliverable_approved':
    case 'feedback_added':
      return campaignVideosRoute ?? campaignRoute
    default:
      return null
  }
}

const NOTIF_EXPLAIN_KEY = 'notif_explain_shown_v2'

// Notification types that change a deliverable's state (assigned / approved / changes
// requested). When one of these arrives we must refresh deliverables so the UI moves
// to the next stage — e.g. after approval the "paste your TikTok link" field appears
// without a manual pull-to-refresh. This is the reliable path even if the Supabase
// realtime publication doesn't include the deliverables table.
const DELIVERABLE_NOTIF_TYPES = new Set(['deliverable_assigned', 'deliverable_revision', 'deliverable_approved'])

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
  const queryClient = useQueryClient()
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null)
  const foregroundListener = useRef<Notifications.EventSubscription | null>(null)
  // Tracks notification identifiers we've already routed, so the cold-start handler
  // (getLastNotificationResponseAsync) and the live response listener don't both act
  // on the same tap.
  const handledResponseIds = useRef<Set<string>>(new Set())
  const userId = session?.user?.id ?? null

  // Shared handling for a notification tap (background, closed, or cold-start). Runs
  // cache invalidation, fire-and-forget open tracking, and navigation. De-duplicates
  // by the notification's request identifier so the same tap isn't handled twice.
  const handleNotificationResponse = (response: Notifications.NotificationResponse, uid: string) => {
    const identifier = response.notification.request.identifier
    if (handledResponseIds.current.has(identifier)) return
    handledResponseIds.current.add(identifier)

    const data = response.notification.request.content.data as Record<string, unknown>

    // Refresh deliverables before navigating so the target screen renders the
    // up-to-date stage rather than the pre-approval one.
    const type = data?.type as string | undefined
    if (type && DELIVERABLE_NOTIF_TYPES.has(type)) {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
    }
    if (type === 'feedback_added') {
      queryClient.invalidateQueries({ queryKey: ['deliverable-feedback'] })
      queryClient.invalidateQueries({ queryKey: ['feedback-unread'] })
    }

    // Fire-and-forget open tracking for analytics
    const batchId = data?.batch_id
    if (typeof batchId === 'string') {
      fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/track-push-open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId, user_id: uid }),
      }).catch(() => {})
    }

    const route = resolveNotificationRoute(data)
    if (route) router.push(route as never)
  }

  useEffect(() => {
    if (!userId) return

    // Guard against a logout/login race: setupPush awaits permission prompts, so a
    // different user could be signed in by the time it resolves. The cleanup flips
    // `active` to false, so a stale in-flight run won't save A's token under B.
    let active = true
    const save = (token: string) => {
      if (active) savePushToken(token, userId)
    }

    const setupPush = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()

      if (existingStatus === 'granted') {
        const token = await registerForPushNotificationsAsync()
        if (token) save(token)
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
                if (token) save(token)
              },
            },
          ]
        )
      } else {
        const token = await registerForPushNotificationsAsync()
        if (token) save(token)
      }
    }

    void setupPush()

    // Foreground: show in-app toast when notification arrives while app is open
    foregroundListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content
      const type = (data as Record<string, unknown> | undefined)?.type as string | undefined

      // Refresh deliverables so the screen advances (e.g. approval reveals the
      // "paste your TikTok link" field) the moment the notification lands.
      if (type && DELIVERABLE_NOTIF_TYPES.has(type)) {
        queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      }
      if (type === 'feedback_added') {
        queryClient.invalidateQueries({ queryKey: ['deliverable-feedback'] })
        queryClient.invalidateQueries({ queryKey: ['feedback-unread'] })
      }

      // The approval tutorial already celebrates approval, so suppress the redundant
      // "You're approved" toast when the app is foregrounded.
      if (type === 'creator_approved') return
      if (title) toast.info(`${title}${body ? `\n${body}` : ''}`)
    })

    // Background/closed: track open + navigate to route on tap
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, userId)
    })

    // Cold-start: the response listener above does NOT fire for the tap that launched
    // a terminated app, so the user would land on the default screen. Read the initial
    // response here and route it through the same handler. We only reach this effect
    // once a userId/session exists, so navigation timing is already gated on auth; the
    // identifier-based de-dupe prevents double handling if the live listener also fires.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) handleNotificationResponse(response, userId)
    })

    return () => {
      active = false
      foregroundListener.current?.remove()
      foregroundListener.current = null
      notificationResponseListener.current?.remove()
      notificationResponseListener.current = null
    }
  }, [userId, queryClient])

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
        // Fail open: a network error / timeout means we couldn't reach the config,
        // NOT that the app was deliberately disabled. Blocking everyone on a flaky
        // connection (subway, cold start before wifi routes) is worse than missing
        // a rare remote shutdown. Only an explicit active:false blocks the app.
        clearTimeout(timeout)
        setKillswitch({ blocked: false, message: '' })
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
            <PushNotificationSetup />
            <TikTokAuthGuard />
            <ReconnectAutoRoute />
            <ReferralLinkHandler />
            <ErrorBoundary>
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="applications" />
                  <Stack.Screen name="campaigns/[id]" />
                  <Stack.Screen name="leaderboard/[id]" />
                  <Stack.Screen name="insights" />
                  <Stack.Screen name="tiers" />
                  <Stack.Screen name="invite" />
                  <Stack.Screen name="invite/[code]" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="reset-password" />
                  <Stack.Screen name="forgot-password" />
                  <Stack.Screen name="verify-otp" />
                </Stack>
                <ToastContainer />
                <OfflineBanner />
              </View>
            </ErrorBoundary>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
