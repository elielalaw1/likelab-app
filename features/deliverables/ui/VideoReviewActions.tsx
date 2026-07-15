import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useVideoPlayer, VideoView } from 'expo-video'
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useQueryClient } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { getDeliverableVideoSignedUrl, deleteDeliverableVideo } from '@/features/deliverables/api'
import { VideoUploadRow } from '@/features/shared/ui/VideoUploadRow'
import type { CampaignPhase } from '@/features/core/types'

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
              <View
                style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: redesign.color.purple, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="play" size={15} color="#fff" />
              </View>
            </View>
          </View>
          <View
            style={{ height: 2, marginHorizontal: 16, marginTop: 12, borderRadius: 999, backgroundColor: 'rgba(99,80,184,0.85)' }}
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

// A calm, reassuring "we've got it, sit tight" state — the peak-end principle says
// the wait shouldn't feel like dead air. A softly pulsing eye + a slow scanning
// sweep signal active work without a jittery spinner.
function InReviewHero({ brandName }: { brandName?: string | null }) {
  const pulse = useSharedValue(0)
  const scan = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.ease) })), -1, false)
    scan.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, false)
    return () => { cancelAnimation(pulse); cancelAnimation(scan) }
  }, [pulse, scan])
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.3 + pulse.value * 0.45, transform: [{ scale: 1 + pulse.value * 0.12 }] }))
  const scanStyle = useAnimatedStyle(() => ({ opacity: 0.5 + pulse.value * 0.5, transform: [{ translateX: -70 + scan.value * 140 }] }))

  return (
    <Animated.View
      entering={FadeIn}
      style={{ alignItems: 'center', gap: 12, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}
    >
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[glowStyle, { position: 'absolute', inset: 0, borderRadius: 32, backgroundColor: 'rgba(99,80,184,0.20)' }]} />
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(99,80,184,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="eye-check-outline" size={28} color={redesign.color.purple} />
        </View>
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ color: redesign.color.ink, fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3, fontFamily: typography.fontFamily, textAlign: 'center' }}>
          {brandName ? `${brandName} is reviewing your video` : 'Your video is in review'}
        </Text>
        <Text style={{ color: redesign.color.muted, fontSize: 13, fontWeight: '500', lineHeight: 18.5, fontFamily: typography.fontFamily, textAlign: 'center', maxWidth: 264 }}>
          Nothing to do right now — we’ll notify you the moment they respond.
        </Text>
      </View>
      {/* slow scanning sweep across a track — active work, no jitter */}
      <View style={{ width: 120, height: 4, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <Animated.View style={[scanStyle, { width: 46, height: '100%', borderRadius: 999, backgroundColor: redesign.color.purple }]} />
      </View>
    </Animated.View>
  )
}

export function VideoReviewActions({ deliverableId, brandName, campaignPhase }: { deliverableId: string; brandName?: string | null; campaignPhase?: CampaignPhase | null }) {
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
          campaignPhase={campaignPhase}
          isRevision
        />
        <Pressable onPress={() => setReplacing(false)} style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ gap: 14 }}>
      <InReviewHero brandName={brandName} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }}>While you wait</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActionButton icon="play-circle-outline" label="View" onPress={() => { haptic.light(); setPlaying(true) }} disabled={busy} />
          <ActionButton icon="autorenew" label="Replace" onPress={() => { haptic.selection(); setReplacing(true) }} disabled={busy} />
          <ActionButton icon="trash-can-outline" label="Delete" onPress={handleDelete} danger disabled={busy} />
          {busy ? <ActivityIndicator size="small" color={redesign.color.muted} /> : null}
        </View>
      </View>
      {playing ? <VideoPlayerModal deliverableId={deliverableId} onClose={() => setPlaying(false)} /> : null}
    </View>
  )
}
