import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { router } from 'expo-router'
import { fetchTikTokVideos, linkTikTokVideo, isReconnectError, type TikTokVideo } from '@/features/deliverables/tiktok-content'

const FONT = typography.fontFamily

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return `${n}`
}

// Lets the creator link the campaign deliverable to one of their published TikToks
// (pulled via video.list) instead of pasting a URL. Gated by the caller behind
// tiktokApiFeaturesEnabled. On link, sets the deliverable url + starts stats tracking.
export function TikTokVideoPicker({ deliverableId, onLinked }: { deliverableId: string; onLinked?: () => void }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['tiktok-videos'],
    queryFn: fetchTikTokVideos,
    staleTime: 5 * 60 * 1000,
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (video: TikTokVideo) => linkTikTokVideo({ deliverableId, video }),
    onSuccess: () => {
      haptic.success()
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['my-videos'] })
      onLinked?.()
    },
    onError: (e) => {
      haptic.warning()
      const msg = e instanceof Error ? e.message : 'Please try again.'
      Alert.alert(
        'Could not link video',
        msg,
        isReconnectError(msg)
          ? [{ text: 'Not now', style: 'cancel' }, { text: 'Reconnect', onPress: () => router.push('/connect-tiktok') }]
          : undefined,
      )
    },
  })

  const videos = data ?? []

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <FontAwesome5 name="tiktok" size={13} color={redesign.color.ink} />
        <Text style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: '800', color: redesign.color.ink }}>Pick your published post</Text>
        {isRefetching ? <ActivityIndicator size="small" color={redesign.color.purple} /> : null}
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 22, alignItems: 'center' }}>
          <ActivityIndicator color={redesign.color.purple} />
        </View>
      ) : isError ? (
        <Pressable onPress={() => refetch()} style={{ paddingVertical: 18, alignItems: 'center', gap: 6, backgroundColor: redesign.color.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong }}>
          <MaterialCommunityIcons name="refresh" size={20} color={redesign.color.muted} />
          <Text style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted }}>Couldn&apos;t load your TikToks — tap to retry</Text>
        </Pressable>
      ) : videos.length === 0 ? (
        <View style={{ paddingVertical: 18, paddingHorizontal: 14, backgroundColor: redesign.color.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong }}>
          <Text style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted, textAlign: 'center', lineHeight: 18 }}>
            No published videos found on your TikTok yet. Post your campaign video, then pick it here — or paste the link below.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
          {videos.map((v) => {
            const active = v.videoId === selected
            return (
              <Pressable
                key={v.videoId}
                onPress={() => { haptic.selection(); setSelected(active ? null : v.videoId) }}
                style={{ width: 126, borderRadius: 16, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: active ? 2 : StyleSheet.hairlineWidth, borderColor: active ? redesign.color.purple : redesign.color.hairlineStrong }}
              >
                <View style={{ height: 170 }}>
                  {v.coverImageUrl ? (
                    <ExpoImage source={{ uri: v.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  ) : (
                    <LinearGradient colors={['rgba(99,80,184,0.5)', 'rgba(99,80,184,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                  <View style={{ position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <MaterialCommunityIcons name="play" size={12} color="#fff" />
                    <Text style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: '800', color: '#fff', fontVariant: ['tabular-nums'] }}>{compact(v.viewCount)}</Text>
                  </View>
                  {active ? (
                    <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: redesign.color.purple, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="check-bold" size={13} color="#fff" />
                    </View>
                  ) : null}
                </View>
                {v.title ? (
                  <Text numberOfLines={2} style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: redesign.color.ink, padding: 7, lineHeight: 14 }}>{v.title}</Text>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      )}

      {selected ? (
        <Animated.View entering={FadeIn} layout={LinearTransition}>
          <Pressable
            onPress={() => {
              const video = videos.find((v) => v.videoId === selected)
              if (video) { haptic.medium(); mutateAsync(video) }
            }}
            disabled={isPending}
            style={{ minHeight: 50, borderRadius: 14, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="link-variant" size={17} color="#fff" />}
            <Text style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: '800', color: '#fff' }}>{isPending ? 'Linking…' : 'Link this video'}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  )
}
