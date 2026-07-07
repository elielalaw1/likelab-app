import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View, ViewToken } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Image as ExpoImage } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { useQuery } from '@tanstack/react-query'
import { getMyVideos, MyVideo } from '@/features/deliverables/api'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'

// Generated thumbnails are local file URIs that persist for the session — cache by video id
// so re-renders (and signed-URL refetches) don't regenerate them.
const thumbCache = new Map<string, string>()

const HEADER = {
  marginLeft: 4,
  fontFamily: typography.fontFamily,
  fontSize: 11,
  fontWeight: '800' as const,
  color: redesign.color.faint,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
}

// Grid tile — shows a real thumbnail generated from the video (cheap Image, no per-cell
// video player, so we stay well under iOS's simultaneous-AVPlayer limit). Falls back to a
// gradient placeholder while generating or if generation fails.
function GridCell({ video, width, onPress }: { video: MyVideo; width: number; onPress: () => void }) {
  const [genThumb, setGenThumb] = useState<string | null>(() => thumbCache.get(video.id) ?? null)
  // Prefer the fast server-generated thumbnail; only generate on-device when there isn't one.
  const thumb = video.thumbnailUrl || genThumb

  useEffect(() => {
    // No source to generate from once the blob is archived; rely on the retained server thumbnail.
    if (video.archived || video.thumbnailUrl || genThumb) return
    let active = true
    VideoThumbnails.getThumbnailAsync(video.url, { time: 0, quality: 0.5 })
      .then(({ uri }) => {
        thumbCache.set(video.id, uri)
        if (active) setGenThumb(uri)
      })
      .catch(() => undefined) // keep the gradient placeholder on failure
    return () => { active = false }
  }, [video.id, video.url, video.thumbnailUrl, video.archived, genThumb])

  return (
    <Pressable onPress={() => { haptic.light(); onPress() }} accessibilityRole="button" accessibilityLabel="Play video" style={{ width, height: width * 1.5, borderRadius: 12, overflow: 'hidden', backgroundColor: '#15151F', alignItems: 'center', justifyContent: 'center' }}>
      {thumb ? (
        <ExpoImage source={{ uri: thumb }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient pointerEvents="none" colors={['rgba(99,80,184,0.4)', 'rgba(99,80,184,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}
      {video.tiktokUrl ? (
        <View style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome5 name="tiktok" size={11} color="#fff" />
        </View>
      ) : null}
      {video.archived ? (
        <View style={{ position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <MaterialCommunityIcons name="archive-outline" size={11} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 }}>ARCHIVED</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

// Archived item — the original blob was removed by the cleanup job, so there's nothing to play.
// We show the retained thumbnail full-screen plus the TikTok link (where the video actually lives now).
function ArchivedFeedItem({ video, width, height }: { video: MyVideo; width: number; height: number }) {
  const poster = video.thumbnailUrl ?? thumbCache.get(video.id) ?? null
  return (
    <View style={{ width, height, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      {poster ? (
        <ExpoImage source={{ uri: poster }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" blurRadius={2} />
      ) : (
        <LinearGradient pointerEvents="none" colors={['rgba(99,80,184,0.4)', 'rgba(99,80,184,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      )}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ alignItems: 'center', gap: 14, paddingHorizontal: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="archive-outline" size={30} color="#fff" />
        </View>
        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', textAlign: 'center' }}>This video has been archived</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 }}>
          {video.tiktokUrl ? 'Watch the published version on TikTok.' : 'The original upload is no longer stored.'}
        </Text>
        {video.tiktokUrl ? (
          <Pressable
            onPress={() => Linking.openURL(video.tiktokUrl!).catch(() => undefined)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' }}
          >
            <FontAwesome5 name="tiktok" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>Watch on TikTok</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

// Full-screen feed item — plays when it's the active page, tap to pause/play.
function FeedVideoItem({ video, active, width, height }: { video: MyVideo; active: boolean; width: number; height: number }) {
  const player = useVideoPlayer(video.url, (p) => { p.loop = true })
  const [paused, setPaused] = useState(false)
  const [started, setStarted] = useState(false)

  // Hide the poster the moment real playback begins → instant-feeling, never a black frame.
  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => { if (isPlaying) setStarted(true) })
    return () => sub.remove()
  }, [player])

  useEffect(() => {
    if (active && !paused) player.play()
    else player.pause()
  }, [active, paused, player])

  // Reuse the server thumbnail (or the one the grid already generated) as an instant poster.
  const poster = video.thumbnailUrl ?? thumbCache.get(video.id) ?? null

  return (
    <Pressable onPress={() => { haptic.selection(); setPaused((p) => !p) }} accessibilityRole="button" accessibilityLabel={paused ? 'Play' : 'Pause'} style={{ width, height, backgroundColor: '#000' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
      {!started && poster ? (
        <ExpoImage source={{ uri: poster }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
      ) : null}
      {paused && active ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="play" size={42} color="#fff" />
          </View>
        </View>
      ) : null}
      {video.tiktokUrl ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 46, alignItems: 'center' }}>
          <Pressable
            onPress={() => Linking.openURL(video.tiktokUrl!).catch(() => undefined)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.25)' }}
          >
            <FontAwesome5 name="tiktok" size={15} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800' }}>Watch on TikTok</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  )
}

// Embedded video grid for the profile — tap a tile to open the immersive swipe feed.
// pagePadding = the Screen's horizontal content padding (16 each side).
export function MyVideosFeed({ pagePadding = 16, title = 'My videos' }: { pagePadding?: number; title?: string }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['my-videos'], queryFn: getMyVideos, placeholderData: (prev) => prev })
  const videos = data || []
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const gutter = 6
  const cellW = (width - pagePadding * 2 - gutter * 2) / 3

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable)
    if (first?.index != null) setActiveIndex(first.index)
  }).current
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current

  const open = (index: number) => { setActiveIndex(index); setOpenIndex(index) }

  return (
    <View style={{ gap: 10 }}>
      <Text style={HEADER}>{title}</Text>

      {isLoading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={redesign.color.purple} />
        </View>
      ) : isError && videos.length === 0 ? (
        <View style={{ backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingVertical: 26, paddingHorizontal: 22, alignItems: 'center', gap: 8, ...redesign.shadow.card }}>
          <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(220,38,38,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
          </View>
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800' }}>Couldn&apos;t load your videos</Text>
          <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 }}>
            Check your connection and try again.
          </Text>
          <Pressable onPress={() => refetch()} style={{ marginTop: 4, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, backgroundColor: redesign.color.ink }}>
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '800' }}>Retry</Text>
          </Pressable>
        </View>
      ) : videos.length === 0 ? (
        <View style={{ backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingVertical: 26, paddingHorizontal: 22, alignItems: 'center', gap: 8, ...redesign.shadow.card }}>
          <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="video-outline" size={24} color={redesign.color.purple} />
          </View>
          <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800' }}>No videos yet</Text>
          <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 19 }}>
            Videos you upload to campaigns show up here. Tap one to watch.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gutter }}>
          {videos.map((v, i) => (
            <GridCell key={v.id} video={v} width={cellW} onPress={() => open(i)} />
          ))}
        </View>
      )}

      {/* Immersive swipeable player */}
      <Modal visible={openIndex != null} animationType="fade" onRequestClose={() => setOpenIndex(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <StatusBar style="light" />
          {openIndex != null ? (
            <FlatList
              data={videos}
              keyExtractor={(v) => v.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              initialScrollIndex={openIndex}
              windowSize={3}
              maxToRenderPerBatch={2}
              getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
              onViewableItemsChanged={onViewable}
              viewabilityConfig={viewabilityConfig}
              renderItem={({ item, index }) =>
                item.archived ? (
                  <ArchivedFeedItem video={item} width={width} height={height} />
                ) : (
                  <FeedVideoItem video={item} active={index === activeIndex} width={width} height={height} />
                )
              }
            />
          ) : null}
          <View style={{ position: 'absolute', top: 0, left: 0, paddingTop: Math.max(insets.top, 50) + 6, paddingLeft: 14 }}>
            <Pressable onPress={() => { haptic.selection(); setOpenIndex(null) }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
