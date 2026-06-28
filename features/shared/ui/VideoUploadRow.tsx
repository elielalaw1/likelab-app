import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'
import { MediaPermissionError, pickVideoFromLibrary } from '@/lib/video-picker'
import { useLatestSubmission, useSubmissionStatus, useUploadVideo } from '@/features/deliverables/hooks'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { toast } from '@/features/shared/ui/Toast'

type Props = {
  deliverableId: string
  submitLabel?: string
  onDone?: () => void
}

export function VideoUploadRow({ deliverableId, submitLabel = 'Upload video', onDone }: Props) {
  const { palette } = useTheme()
  const queryClient = useQueryClient()
  const [submissionId, setSubmissionId] = useState<string | null>(null)
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

  // When the backend finishes processing, refetch the parent deliverable so the
  // row flips out of the upload state without a manual pull-to-refresh.
  useEffect(() => {
    if (submission?.status === 'submitted') {
      // ['deliverables'] prefix-matches ['deliverables','campaign']; also refresh the profile feed.
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['my-videos'] })
      // Prominent confirmation — the inline "Video submitted" is easy to miss after a
      // long upload, so surface a success banner the creator can't miss.
      toast.success('Video uploaded — submitted for review')
      onDone?.()
    } else if (submission?.status === 'failed') {
      // Keep the raw server error in the dev logs; the creator sees a friendly message.
      console.warn('[VideoUploadRow] server processing failed:', submission?.errorMessage)
    }
  }, [submission?.status, submission?.errorMessage, queryClient, onDone])

  const serverStatus = submission?.status
  const isDone = serverStatus === 'submitted'
  // Treat a polling timeout (processor stalled/died silently) as a failure so the
  // UI falls out of the infinite "Processing…" spinner into a retry affordance.
  const isFailed = stage === 'error' || serverStatus === 'failed' || isTimedOut
  const isBusy =
    !isFailed &&
    !isDone &&
    (stage === 'compressing' || stage === 'uploading' || stage === 'processing')

  const handlePick = async () => {
    haptic.light()
    try {
      const picked = await pickVideoFromLibrary()
      if (!picked) return

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
      if (uploadError instanceof MediaPermissionError) {
        Alert.alert(
          'Allow photo access',
          'LikeLab needs access to your photo library to upload your video.',
          uploadError.canAskAgain
            ? [{ text: 'OK' }]
            : [
                { text: 'Not now', style: 'cancel' },
                { text: 'Open Settings', onPress: () => { void Linking.openSettings() } },
              ]
        )
        return
      }
      Alert.alert(
        'Upload failed',
        uploadError instanceof Error ? uploadError.message : 'Could not upload your video. Please try again.'
      )
    }
  }

  if (isDone) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <MaterialCommunityIcons name="check-circle" size={18} color="#0F9F6E" />
        <Text style={{ color: '#0F9F6E', fontSize: 13, fontWeight: '700', fontFamily: typography.fontFamily }}>
          Video submitted
        </Text>
      </View>
    )
  }

  if (isBusy) {
    const label =
      stage === 'compressing'
        ? `Compressing… ${Math.round(compressionProgress * 100)}%`
        : stage === 'uploading'
          ? 'Uploading…'
          : 'Processing…'
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: 44,
          paddingHorizontal: 14,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: palette.borderColor,
          backgroundColor: palette.inputBg,
        }}
      >
        <ActivityIndicator size="small" color={palette.text} />
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600', fontFamily: typography.fontFamily }}>
          {label}
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 8 }}>
      {isFailed ? (
        <Text style={{ color: palette.dangerText, fontSize: 12, fontFamily: typography.fontFamily }}>
          {error ||
            (isTimedOut
              ? 'Processing is taking longer than expected. Please try uploading again.'
              : 'Something went wrong while processing your video. Please try uploading again.')}
        </Text>
      ) : null}
      <LiquidButton
        label={isFailed ? 'Try again' : submitLabel}
        onPress={handlePick}
        minHeight={48}
        borderRadius={radii.button}
        icon={<MaterialCommunityIcons name="tray-arrow-up" size={18} color="#fff" />}
      />
    </View>
  )
}
