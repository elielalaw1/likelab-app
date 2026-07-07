import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { AppState, Platform } from 'react-native'

// Feed real device connectivity into React Query. Without this, RN always reports
// "online", so queries keep firing into the void offline and `refetchOnReconnect`
// never triggers. With it, RQ pauses while offline and auto-refetches on reconnect.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
  })
)

// RN has no window-focus event, so without this every `refetchOnWindowFocus: true`
// flag in the app (e.g. useCampaign, useDeliverableFeedback) is inert. Drive focus
// from AppState so those queries refetch when the app returns to the foreground.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (state) => {
    if (Platform.OS !== 'web') handleFocus(state === 'active')
  })
  return () => sub.remove()
})

export const queryClient = new QueryClient({
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
