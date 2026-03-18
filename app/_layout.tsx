import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useFonts } from 'expo-font'
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat'
import { NotificationsProvider } from '@/features/notifications/hooks'
import { AppLoadingScreen } from '@/features/shared/components/AppLoadingScreen'

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

  if (!fontsLoaded) {
    return <AppLoadingScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="campaigns/[id]" />
          <Stack.Screen name="settings" />
        </Stack>
      </NotificationsProvider>
    </QueryClientProvider>
  )
}
