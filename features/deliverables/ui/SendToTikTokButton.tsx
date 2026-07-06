import { Alert, Linking, Pressable, ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated'
import { useMutation } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { router } from 'expo-router'
import { postToTikTokDraft, isReconnectError } from '@/features/deliverables/tiktok-content'

const FONT = typography.fontFamily

// Open the native TikTok app (so the creator lands in their inbox to finish
// posting) — fall back to the website only if the app isn't installed. iOS lets
// openURL launch a scheme even when it's not in LSApplicationQueriesSchemes, so
// we just try and catch rather than relying on canOpenURL.
async function openTikTok() {
  try {
    await Linking.openURL('tiktok://')
  } catch {
    Linking.openURL('https://www.tiktok.com/').catch(() => undefined)
  }
}

const STEPS = [
  'Tap “Open TikTok” below',
  'Open your inbox (notifications) and tap the uploaded video',
  'Edit the caption and post it',
]

// Pushes the approved deliverable video to the creator's TikTok drafts via the
// Content Posting API. Gated by the caller behind tiktokApiFeaturesEnabled.
export function SendToTikTokButton({ deliverableId }: { deliverableId: string }) {
  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: () => postToTikTokDraft(deliverableId),
    onSuccess: () => haptic.success(),
    onError: (e) => {
      haptic.warning()
      const msg = e instanceof Error ? e.message : 'Please try again.'
      Alert.alert(
        'Could not send to TikTok',
        msg,
        isReconnectError(msg)
          ? [{ text: 'Not now', style: 'cancel' }, { text: 'Reconnect', onPress: () => router.push('/connect-tiktok') }]
          : undefined,
      )
    },
  })

  if (isSuccess) {
    return (
      <Animated.View
        entering={FadeIn}
        style={{ gap: 12, backgroundColor: redesign.color.card, borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Animated.View entering={ZoomIn.springify().damping(11)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: redesign.color.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="check-decagram" size={20} color={redesign.color.successText} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>It’s in your TikTok inbox</Text>
            <Text style={{ fontFamily: FONT, fontSize: 12, fontWeight: '600', color: redesign.color.muted }}>Three taps to go live</Text>
          </View>
        </View>

        <View style={{ gap: 9 }}>
          {STEPS.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: '900', color: redesign.color.purple }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: redesign.color.ink, lineHeight: 17 }}>{s}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={openTikTok}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 13, backgroundColor: '#000' }}
        >
          <FontAwesome5 name="tiktok" size={14} color="#fff" />
          <Text style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: '800', color: '#fff' }}>Open TikTok</Text>
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <Pressable
      onPress={() => { haptic.medium(); mutate() }}
      disabled={isPending}
      style={{ minHeight: 50, borderRadius: 14, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, opacity: isPending ? 0.7 : 1 }}
    >
      {isPending ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome5 name="tiktok" size={16} color="#fff" />}
      <Text style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: '800', color: '#fff' }}>{isPending ? 'Sending to TikTok…' : 'Send to TikTok'}</Text>
    </Pressable>
  )
}
