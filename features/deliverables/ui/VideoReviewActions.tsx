import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useQueryClient } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { getDeliverableVideoSignedUrl, deleteDeliverableVideo } from '@/features/deliverables/api'
import { VideoUploadRow } from '@/features/shared/ui/VideoUploadRow'

// Inner player — only mounted once a url exists, so the hook always gets a valid source.
// Autoplays the moment it's ready.
function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => { p.loop = false; p.play() })
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls allowsFullscreen />
}

// Opens instantly on tap; fetches the signed URL in parallel and plays as soon as ready.
function VideoPlayerModal({ deliverableId, onClose }: { deliverableId: string; onClose: () => void }) {
  const insets = useSafeAreaInsets()
  const topPad = Math.max(insets.top, 50)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getDeliverableVideoSignedUrl(deliverableId)
      .then((u) => {
        if (!active) return
        if (u) setUrl(u)
        else setError('Could not find your video.')
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Could not load the video.') })
    return () => { active = false }
  }, [deliverableId])

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
        {url ? (
          <Player url={url} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {error ? (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: typography.fontFamily, fontSize: 14 }}>{error}</Text>
            ) : (
              <ActivityIndicator size="large" color="#fff" />
            )}
          </View>
        )}

        {/* Top scrim + branded bar */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(11,11,15,0.7)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topPad + 90 }}
        />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: topPad + 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close video"
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Text style={{ color: 'rgba(255,255,255,0.92)', fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 }}>
                Your video
              </Text>
              <LinearGradient
                colors={redesign.gradient.holographic}
                locations={redesign.gradient.holographicLocations}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="play" size={15} color="#fff" />
              </LinearGradient>
            </View>
          </View>
          <LinearGradient
            colors={redesign.gradient.holographic}
            locations={redesign.gradient.holographicLocations}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ height: 2, marginHorizontal: 16, marginTop: 12, borderRadius: 999, opacity: 0.9 }}
          />
        </View>
      </View>
    </Modal>
  )
}

// Lightweight "View your video" link — usable in the approved/live states too.
export function ViewVideoButton({ deliverableId }: { deliverableId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable
        onPress={() => { haptic.light(); setOpen(true) }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 }}
      >
        <MaterialCommunityIcons name="play-circle-outline" size={16} color={redesign.color.purple} />
        <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>View your video</Text>
      </Pressable>
      {open ? <VideoPlayerModal deliverableId={deliverableId} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function ActionButton({ icon, label, onPress, danger, disabled }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const color = danger ? '#DC2626' : redesign.color.ink
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 40,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: danger ? 'rgba(220,38,38,0.3)' : redesign.color.hairlineStrong,
        backgroundColor: danger ? 'rgba(220,38,38,0.05)' : redesign.color.card,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  )
}

export function VideoReviewActions({ deliverableId }: { deliverableId: string }) {
  const queryClient = useQueryClient()
  const [replacing, setReplacing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)

  const refresh = () => {
    // ['deliverables'] prefix-matches ['deliverables','campaign'] too.
    queryClient.invalidateQueries({ queryKey: ['deliverables'] })
    queryClient.invalidateQueries({ queryKey: ['my-videos'] })
  }

  const handleDelete = () => {
    haptic.warning()
    Alert.alert(
      'Delete video?',
      'This removes your uploaded video so you can upload a new one. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true)
              await deleteDeliverableVideo(deliverableId)
              refresh()
            } catch (e) {
              Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.')
            } finally {
              setBusy(false)
            }
          },
        },
      ]
    )
  }

  if (replacing) {
    return (
      <View style={{ gap: 8 }}>
        <VideoUploadRow
          deliverableId={deliverableId}
          submitLabel="Upload new video"
          onDone={() => { refresh(); setTimeout(() => setReplacing(false), 1200) }}
        />
        <Pressable onPress={() => setReplacing(false)} style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ActionButton icon="play-circle-outline" label="View" onPress={() => { haptic.light(); setPlaying(true) }} disabled={busy} />
        <ActionButton icon="autorenew" label="Replace" onPress={() => { haptic.selection(); setReplacing(true) }} disabled={busy} />
        <ActionButton icon="trash-can-outline" label="Delete" onPress={handleDelete} danger disabled={busy} />
        {busy ? <ActivityIndicator size="small" color={redesign.color.muted} /> : null}
      </View>
      {playing ? <VideoPlayerModal deliverableId={deliverableId} onClose={() => setPlaying(false)} /> : null}
    </>
  )
}
