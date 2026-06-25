import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

const PROJECT_ID = '4c59e78f-1120-4697-91af-9f203d64132d'

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })
    return tokenData.data
  } catch {
    return null
  }
}

export async function savePushToken(token: string, userId: string): Promise<void> {
  // supabase-js resolves (not throws) on a query error, so capture `error`
  // explicitly — otherwise a failed save leaves the user with notifications
  // silently disabled and no trace to debug.
  const { error } = await supabase
    .from('creator_profiles')
    .update({ push_token: token })
    .eq('user_id', userId)
  if (error) console.warn('[push] failed to save push token:', error.message)
}

export async function deletePushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('creator_profiles')
    .update({ push_token: null })
    .eq('user_id', userId)
  if (error) console.warn('[push] failed to clear push token:', error.message)
}
