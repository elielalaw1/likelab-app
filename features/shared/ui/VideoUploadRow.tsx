import { useEffect, useRef, useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { radii, redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { MediaPermissionError, PickedVideo, pickVideoFromLibrary } from '@/lib/video-picker'
import { useLatestSubmission, useSubmissionStatus, useUploadVideo } from '@/features/deliverables/hooks'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  deliverableId: string
  submitLabel?: string
  brandName?: string | null
  onDone?: () => void
}

// The video's poster is the hero object across every state — it appears on pick,
// gets a progress cuff while sending, then springs up at the peak. Continuity of a
// single object is what makes the flow feel alive rather than a sequence of screens.
const HERO_W = 148
const HERO_H = 196

function fmtSize(bytes?: number) {
  if (!bytes) return null
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function fmtDuration(sec?: number) {
  if (!sec) return null
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// A small portrait poster; falls back to a tinted film placeholder before the
// thumbnail is generated (or after a remount recovery where we never had the file).
function HeroPoster({ thumb, scale = 1, dim = false, children }: { thumb: string | null; scale?: number; dim?: boolean; children?: React.ReactNode }) {
  return (
    <View
      style={{
        width: HERO_W * scale,
        height: HERO_H * scale,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#15151F',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: redesign.color.hairlineStrong,
        ...redesign.shadow.card,
      }}
    >
      {thumb ? (
        <ExpoImage source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(99,80,184,0.12)' }}>
          <MaterialCommunityIcons name="movie-open-outline" size={34} color={redesign.color.purple} />
        </View>
      )}
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,8,12,0.42)' }]} /> : null}
      {children}
    </View>
  )
}

export function VideoUploadRow({ deliverableId, submitLabel = 'Upload video', brandName, onDone }: Props) {
  const { width } = useWindowDimensions()
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [picked, setPicked] = useState<PickedVideo | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)
  // Monotonic pick token: thumbnail generation is async and can resolve out of
  // order, so only the latest pick's poster is allowed to win.
  const pickSeqRef = useRef(0)
  const { upload, stage, compressionProgress, error } = useUploadVideo()
  const { data: submission, isTimedOut } = useSubmissionStatus(submissionId ?? undefined)

  // Recover an in-flight upload after a remount (creator navigated away during
  // processing and came back): adopt the latest submission and resume polling
  // instead of re-offering the Upload button, which risks a duplicate upload.
  const { data: latestSubmission } = useLatestSubmission(submissionId ? undefined : deliverableId)
  useEffect(() => {
    if (submissionId) return
    if (latestSubmission && (latestSubmission.status === 'uploading' || latestSubmission.status === 'processing')) {
      setSubmissionId(latestSubmission.id)
    }
  }, [latestSubmission, submissionId])

  // When the backend finishes processing, celebrate — but do NOT invalidate the
  // deliverables query here. Doing so would flip this deliverable's stage
  // (upload → under_review), causing the parent to swap this row out for the
  // review UI and unmount the celebration mid-animation. The list refresh is
  // deferred to the sheet's close (parent), so the peak moment stays put until
  // the creator taps Done.
  useEffect(() => {
    if (submission?.status === 'submitted') {
      haptic.success()
    } else if (submission?.status === 'failed') {
      // Keep the raw server error in the dev logs; the creator sees a friendly message.
      console.warn('[VideoUploadRow] server processing failed:', submission?.errorMessage)
    }
  }, [submission?.status, submission?.errorMessage])

  const serverStatus = submission?.status
  const isDone = serverStatus === 'submitted'
  // Treat a polling timeout (processor stalled/died silently) as a failure so the
  // UI falls out of the infinite "Processing…" spinner into a retry affordance.
  const isFailed = stage === 'error' || serverStatus === 'failed' || isTimedOut
  const isBusy =
    !isFailed &&
    !isDone &&
    (stage === 'compressing' ||
      stage === 'uploading' ||
      stage === 'processing' ||
      // A remount adopts an in-flight submission (recovery effect above) but the
      // fresh useUploadVideo() hook resets local `stage` to 'idle'. Without folding
      // the recovered serverStatus in, the row would render the "Choose your video"
      // dropzone over an actively-processing upload and a second pick would fire a
      // duplicate upload — the exact case the recovery effect exists to prevent.
      serverStatus === 'uploading' ||
      serverStatus === 'processing')

  // Gentle breathing glow used on the invite + the send CTA so an actionable
  // state quietly draws the eye without any decorative gradient.
  const pulse = useSharedValue(0)
  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })), -1, false)
    return () => cancelAnimation(pulse)
  }, [pulse])
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.45, transform: [{ scale: 1 + pulse.value * 0.06 }] }))

  const pickVideo = async () => {
    haptic.light()
    try {
      const result = await pickVideoFromLibrary()
      if (!result) return
      const mySeq = ++pickSeqRef.current
      setSubmissionId(null)
      setThumb(null)
      setPicked(result)
      // Generate a poster for the preview; non-fatal if it fails (placeholder shows).
      VideoThumbnails.getThumbnailAsync(result.uri, { time: 1000, quality: 0.6 })
        .then(({ uri }) => { if (pickSeqRef.current === mySeq) setThumb(uri) })
        .catch(() => undefined)
    } catch (pickError) {
      haptic.warning()
      if (pickError instanceof MediaPermissionError) {
        Alert.alert(
          'Allow photo access',
          'LikeLab needs access to your photo library to upload your video.',
          pickError.canAskAgain
            ? [{ text: 'OK' }]
            : [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => { void Linking.openSettings() } },
              ]
        )
        return
      }
      Alert.alert('Could not open your library', pickError instanceof Error ? pickError.message : 'Please try again.')
    }
  }

  const submit = async () => {
    if (!picked) return
    haptic.medium()
    try {
      setSubmissionId(null)
      const sub = await upload({
        deliverableId,
        videoUri: picked.uri,
        fileName: picked.fileName,
        fileSize: picked.fileSize,
        mimeType: picked.mimeType,
        compressionOptions: { quality: 'medium' },
      })
      setSubmissionId(sub.id)
      haptic.success()
    } catch (uploadError) {
      haptic.warning()
      Alert.alert(
        'Upload failed',
        uploadError instanceof Error ? uploadError.message : 'Could not upload your video. Please try again.'
      )
    }
  }

  // ── Peak moment: the video is in the brand's hands ────────────────────────────
  if (isDone) {
    return (
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <ConfettiCannon count={110} origin={{ x: width / 2, y: 0 }} autoStart fadeOut explosionSpeed={440} fallSpeed={2700} />
        <Animated.View entering={ZoomIn.springify().damping(12).stiffness(140)}>
          <HeroPoster thumb={thumb} scale={1.04}>
            {/* delivered stamp springing onto the poster */}
            <Animated.View
              entering={ZoomIn.delay(220).springify().damping(9)}
              style={{ position: 'absolute', bottom: -14, alignSelf: 'center', left: 0, right: 0, alignItems: 'center' }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: redesign.color.successBg, borderWidth: 3, borderColor: redesign.color.bg, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="check-decagram" size={30} color={redesign.color.successText} />
              </View>
            </Animated.View>
          </HeroPoster>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ gap: 5, alignItems: 'center', marginTop: 6 }}>
          <Text style={{ color: redesign.color.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
            {brandName ? `Sent to ${brandName}` : 'Video submitted'}
          </Text>
          <Text style={{ color: redesign.color.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '500', fontFamily: typography.fontFamily, textAlign: 'center', maxWidth: 270 }}>
            {brandName
              ? `${brandName} will review your video and get back to you.`
              : 'The brand will review your video and get back to you.'}
          </Text>
        </Animated.View>
        <View style={{ alignSelf: 'stretch', marginTop: 2 }}>
          <LiquidButton label="Done" onPress={() => onDone?.()} minHeight={48} borderRadius={radii.button} />
        </View>
      </View>
    )
  }

  // ── The send: the poster carries a live progress cuff, never a bare spinner ───
  if (isBusy) {
    const pct = Math.round(compressionProgress * 100)
    const label =
      stage === 'compressing'
        ? 'Polishing your video'
        : stage === 'uploading'
          ? brandName ? `Sending to ${brandName}` : 'Uploading'
          : 'Almost there'
    // Compression is a real %; upload/processing show a confident near-full bar
    // (no jumpy fake progress) so it feels moments-from-done.
    const barPct = stage === 'compressing' ? Math.max(pct, 5) : 94
    return (
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 6 }}>
        <View style={{ width: HERO_W, height: HERO_H }}>
          {/* pulsing glow behind the poster */}
          <Animated.View style={[glowStyle, { position: 'absolute', inset: -8, borderRadius: 24, backgroundColor: 'rgba(99,80,184,0.22)' }]} />
          <HeroPoster thumb={thumb} dim>
            <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="rocket-launch" size={30} color="#fff" />
            </View>
            {/* progress cuff pinned to the bottom of the poster */}
            <View style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${barPct}%`, borderRadius: 999, backgroundColor: '#fff' }} />
              </View>
            </View>
          </HeroPoster>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text style={{ color: redesign.color.ink, fontSize: 15, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>
            {label}{stage === 'compressing' ? ` · ${pct}%` : ''}
          </Text>
          <Text style={{ color: redesign.color.faint, fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>Keep this open for a moment…</Text>
        </View>
      </View>
    )
  }

  // ── Preview: anticipation — see it, then send it (or swap it out) ─────────────
  if (picked) {
    const meta = [fmtDuration(picked.duration), fmtSize(picked.fileSize)].filter(Boolean).join('  ·  ')
    return (
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 4 }}>
        {isFailed ? (
          <Text style={{ color: '#E11D48', fontSize: 12.5, fontWeight: '600', fontFamily: typography.fontFamily, textAlign: 'center' }}>
            {error || 'That upload didn’t go through. Try sending it again.'}
          </Text>
        ) : null}
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <HeroPoster thumb={thumb}>
            <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="play" size={22} color="#fff" />
              </View>
            </View>
            {meta ? (
              <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '700', fontFamily: typography.fontFamily }}>{meta}</Text>
              </View>
            ) : null}
          </HeroPoster>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(120)} style={{ alignItems: 'center', gap: 2 }}>
          <Text style={{ color: redesign.color.ink, fontSize: 15, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>
            {brandName ? `Ready for ${brandName}?` : 'Ready to send?'}
          </Text>
          <Text style={{ color: redesign.color.muted, fontSize: 12.5, fontWeight: '600', fontFamily: typography.fontFamily, textAlign: 'center', maxWidth: 260 }}>
            This goes straight to the brand for review — make it count.
          </Text>
        </Animated.View>
        <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 2 }}>
          <LiquidButton
            label={isFailed ? 'Try sending again' : brandName ? `Send to ${brandName}` : 'Send for review'}
            onPress={submit}
            minHeight={50}
            borderRadius={radii.button}
            icon={<MaterialCommunityIcons name="rocket-launch-outline" size={18} color="#fff" />}
          />
          <Pressable onPress={pickVideo} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text style={{ color: redesign.color.muted, fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily }}>Choose a different video</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Invite: an inviting dropzone that opens the peak ──────────────────────────
  return (
    <View style={{ gap: 10 }}>
      {isFailed ? (
        <Text style={{ color: '#E11D48', fontSize: 12, fontFamily: typography.fontFamily }}>
          {error ||
            (isTimedOut
              ? 'Processing is taking longer than expected. Please try uploading again.'
              : 'Something went wrong while processing your video. Please try uploading again.')}
        </Text>
      ) : null}
      <Pressable onPress={pickVideo} accessibilityRole="button" accessibilityLabel={submitLabel}>
        {({ pressed }) => (
          <View
            style={{
              alignItems: 'center',
              gap: 10,
              paddingVertical: 26,
              paddingHorizontal: 18,
              borderRadius: radii.input,
              borderWidth: 1.5,
              borderColor: pressed ? redesign.color.purple : redesign.color.hairlineStrong,
              backgroundColor: redesign.color.card,
              ...redesign.shadow.card,
            }}
          >
            <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={[glowStyle, { position: 'absolute', inset: 0, borderRadius: 31, backgroundColor: 'rgba(99,80,184,0.20)' }]} />
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: redesign.color.purple, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="tray-arrow-up" size={26} color="#fff" />
              </View>
            </View>
            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text style={{ color: redesign.color.ink, fontSize: 15.5, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>
                {isFailed ? 'Choose your video again' : 'Choose your video'}
              </Text>
              <Text style={{ color: redesign.color.muted, fontSize: 12.5, fontWeight: '600', fontFamily: typography.fontFamily, textAlign: 'center' }}>
                {brandName ? `It goes straight to ${brandName}` : 'Tap to pick from your library'}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  )
}
