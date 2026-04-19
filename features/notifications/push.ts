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

export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: expoPushToken, sound: 'default', title, body }),
  })
}

export async function savePushToken(token: string, userId: string): Promise<void> {
  try {
    await supabase
      .from('creator_profiles')
      .update({ push_token: token })
      .eq('user_id', userId)
  } catch {
    // Column may not exist yet — safe to ignore
  }
}
