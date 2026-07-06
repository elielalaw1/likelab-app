import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated'
import { radii, redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { MediaPermissionError, PickedVideo, pickVideoFromLibrary } from '@/lib/video-picker'
import { useSubmitLink, useUploadVideo } from '@/features/deliverables/hooks'
import { isValidTikTokUrl } from '@/lib/validate-tiktok-url'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  deliverableId: string
  brandName?: string | null
  onDone?: () => void
}

type Phase = 'idle' | 'sending' | 'done'

// Standard (no-review) campaigns: the creator has already posted on TikTok, so they
// hand over BOTH the live link and the raw file in one step — and it goes live right
// away, no brand approval gate. The raw upload runs first (stored for the brand), then
// the link is submitted, which flips the deliverable to live.
export function CombinedDeliveryRow({ deliverableId, brandName, onDone }: Props) {
  const { width } = useWindowDimensions()
  const [picked, setPicked] = useState<PickedVideo | null>(null)
  const [thumb, setThumb] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const { upload, stage, compressionProgress } = useUploadVideo()
  const { mutateAsync: submitLink } = useSubmitLink()

  const trimmed = url.trim()
  const urlValid = isValidTikTokUrl(trimmed)
  const canSubmit = phase === 'idle' && !!picked && urlValid

  const pickVideo = async () => {
    haptic.light()
    try {
      const result = await pickVideoFromLibrary()
      if (!result) return
      setThumb(null)
      setPicked(result)
      VideoThumbnails.getThumbnailAsync(result.uri, { time: 1000, quality: 0.6 })
        .then(({ uri }) => setThumb(uri))
        .catch(() => undefined)
    } catch (pickError) {
      haptic.warning()
      if (pickError instanceof MediaPermissionError) {
        Alert.alert(
          'Allow photo access',
          'LikeLab needs access to your photo library to attach your raw file.',
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
    if (!picked || !urlValid) return
    haptic.medium()
    setPhase('sending')
    try {
      // Raw file first — stored for the brand. Then the link, which takes it live.
      await upload({
        deliverableId,
        videoUri: picked.uri,
        fileName: picked.fileName,
        fileSize: picked.fileSize,
        mimeType: picked.mimeType,
        compressionOptions: { quality: 'medium' },
      })
      await submitLink({ deliverableId, url: trimmed })
      haptic.success()
      setPhase('done')
    } catch (submitError) {
      haptic.warning()
      setPhase('idle')
      Alert.alert(
        'Delivery failed',
        submitError instanceof Error ? submitError.message : 'Could not publish your delivery. Please try again.'
      )
    }
  }

  // ── Peak: it's live ───────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <View style={{ alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <ConfettiCannon count={110} origin={{ x: width / 2, y: 0 }} autoStart fadeOut explosionSpeed={440} fallSpeed={2700} />
        <Animated.View entering={ZoomIn.springify().damping(12).stiffness(140)}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: redesign.color.successBg, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="star-circle" size={46} color={redesign.color.successText} />
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(220).springify()} style={{ gap: 5, alignItems: 'center' }}>
          <Text style={{ color: redesign.color.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, fontFamily: typography.fontFamily, textAlign: 'center' }}>
            {"You're live"}
          </Text>
          <Text style={{ color: redesign.color.muted, fontSize: 13.5, lineHeight: 19, fontWeight: '500', fontFamily: typography.fontFamily, textAlign: 'center', maxWidth: 270 }}>
            {brandName ? `Your video is out in the world for ${brandName}, and your raw file is on its way to them.` : 'Your video is live and your raw file is on its way to the brand.'}
          </Text>
        </Animated.View>
        <View style={{ alignSelf: 'stretch', marginTop: 2 }}>
          <LiquidButton label="Done" onPress={() => onDone?.()} minHeight={48} borderRadius={radii.button} />
        </View>
      </View>
    )
  }

  // ── Sending ───────────────────────────────────────────────────────────────────
  if (phase === 'sending') {
    const pct = Math.round(compressionProgress * 100)
    const label =
      stage === 'compressing' ? `Polishing your file · ${pct}%`
      : stage === 'uploading' ? 'Uploading your raw file'
      : 'Going live'
    return (
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 18 }}>
        <MaterialCommunityIcons name="rocket-launch" size={30} color={redesign.color.purple} />
        <Text style={{ color: redesign.color.ink, fontSize: 15, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>{label}</Text>
        <Text style={{ color: redesign.color.faint, fontSize: 12, fontWeight: '600', fontFamily: typography.fontFamily }}>Keep this open for a moment…</Text>
      </View>
    )
  }

  // ── Collect: raw file + link, one publish ─────────────────────────────────────
  return (
    <View style={{ gap: 12 }}>
      {/* Raw file */}
      <Pressable onPress={pickVideo} accessibilityRole="button" accessibilityLabel="Attach your raw file">
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: radii.input,
              borderWidth: 1.5,
              borderColor: picked ? '#0F9F6E' : pressed ? redesign.color.purple : redesign.color.hairlineStrong,
              backgroundColor: redesign.color.card,
            }}
          >
            <View style={{ width: 46, height: 60, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(99,80,184,0.10)', alignItems: 'center', justifyContent: 'center' }}>
              {thumb ? (
                <ExpoImage source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
              ) : (
                <MaterialCommunityIcons name="movie-open-outline" size={22} color={redesign.color.purple} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: redesign.color.ink, fontSize: 14.5, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>
                {picked ? 'Raw file attached' : 'Attach your raw file'}
              </Text>
              <Text numberOfLines={1} style={{ color: redesign.color.muted, fontSize: 12.5, fontWeight: '600', fontFamily: typography.fontFamily }}>
                {picked ? (picked.fileName || 'Tap to change') : 'The unedited video, for the brand to reuse'}
              </Text>
            </View>
            <MaterialCommunityIcons name={picked ? 'check-circle' : 'plus-circle-outline'} size={22} color={picked ? '#0F9F6E' : redesign.color.faint} />
          </View>
        )}
      </Pressable>

      {/* TikTok link */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          paddingLeft: 14,
          paddingRight: 10,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: urlValid ? '#0F9F6E' : redesign.color.hairlineStrong,
          backgroundColor: redesign.color.bg,
        }}
      >
        <TextInput
          value={url}
          onChangeText={setUrl}
          placeholder="https://www.tiktok.com/@you/video/…"
          placeholderTextColor={redesign.color.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          style={{ flex: 1, paddingVertical: 12, color: redesign.color.ink, fontSize: 14, fontFamily: typography.fontFamily }}
        />
        {urlValid ? <MaterialCommunityIcons name="check-circle" size={20} color="#0F9F6E" style={{ marginLeft: 6 }} /> : null}
      </View>

      <Animated.View entering={FadeIn}>
        <LiquidButton
          label="Publish — go live"
          onPress={submit}
          disabled={!canSubmit}
          minHeight={50}
          borderRadius={radii.button}
          icon={<MaterialCommunityIcons name="rocket-launch-outline" size={18} color="#fff" />}
        />
      </Animated.View>
      <Text style={{ color: redesign.color.faint, fontSize: 11.5, fontWeight: '600', fontFamily: typography.fontFamily, textAlign: 'center' }}>
        Goes live right away — no review needed for this campaign.
      </Text>
    </View>
  )
}
