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

// Remembers THIS device's most recently registered token so deletePushToken can
// avoid clearing the shared column when it now holds a different device's token.
let lastRegisteredToken: string | null = null

export async function savePushToken(token: string, userId: string): Promise<void> {
  lastRegisteredToken = token

  // Live stores the push token on creator_profiles (single token per user). The
  // multi-device `device_tokens` table only exists on Test, so we write the
  // canonical Live column here. Re-introduce the device_tokens upsert once that
  // table is published to Live (see backend-contract notes).
  const { error } = await supabase
    .from('creator_profiles')
    .update({ push_token: token })
    .eq('user_id', userId)
  if (error) console.warn('[push] failed to save push token:', error.message)
}

export async function deletePushToken(userId: string, token?: string): Promise<void> {
  const deviceToken = token ?? lastRegisteredToken

  // Clear the Live push token, but only if it still holds THIS device's token
  // (avoids one device's logout clobbering a token another device just wrote).
  let query = supabase
    .from('creator_profiles')
    .update({ push_token: null })
    .eq('user_id', userId)
  if (deviceToken) query = query.eq('push_token', deviceToken)
  const { error } = await query
  if (error) console.warn('[push] failed to clear push token:', error.message)
}
