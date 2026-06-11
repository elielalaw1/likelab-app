import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'
import { pickVideoFromLibrary } from '@/lib/video-picker'
import { useSubmissionStatus, useUploadVideo } from '@/features/deliverables/hooks'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  deliverableId: string
  submitLabel?: string
}

export function VideoUploadRow({ deliverableId, submitLabel = 'Upload video' }: Props) {
  const { palette } = useTheme()
  const queryClient = useQueryClient()
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const { upload, stage, compressionProgress, error } = useUploadVideo()
  const { data: submission } = useSubmissionStatus(submissionId ?? undefined)

  // When the backend finishes processing, refetch the parent deliverable so the
  // row flips out of the upload state without a manual pull-to-refresh.
  useEffect(() => {
    if (submission?.status === 'submitted') {
      queryClient.invalidateQueries({ queryKey: ['deliverables'] })
      queryClient.invalidateQueries({ queryKey: ['deliverables', 'campaign'] })
    }
  }, [submission?.status, queryClient])

  const serverStatus = submission?.status
  const isDone = serverStatus === 'submitted'
  const isFailed = stage === 'error' || serverStatus === 'failed'
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
          {error || submission?.errorMessage || 'Upload failed. Please try again.'}
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
