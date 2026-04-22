import { Stack, router } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
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
import { NotificationsProvider } from '@/features/notifications/hooks'
import { ToastContainer } from '@/features/shared/ui/Toast'
import { registerForPushNotificationsAsync, savePushToken } from '@/features/notifications/push'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'

SplashScreen.preventAutoHideAsync()

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
  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return

    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token, userId)
    })

    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>
      const link = data?.link
      if (typeof link === 'string' && link) {
        router.push(link as never)
      }
    })

    return () => {
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
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

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
            <Stack.Screen name="push-test" />
          </Stack>
          <ToastContainer />
        </View>
      </NotificationsProvider>
    </QueryClientProvider>
  )
}
