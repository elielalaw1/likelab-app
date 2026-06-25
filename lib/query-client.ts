import { QueryClient, onlineManager } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'

// Feed real device connectivity into React Query. Without this, RN always reports
// "online", so queries keep firing into the void offline and `refetchOnReconnect`
// never triggers. With it, RQ pauses while offline and auto-refetches on reconnect.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
  })
)

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
