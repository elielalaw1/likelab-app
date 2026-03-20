import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, palette, radii, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import type { VideoUploadStage } from '@/features/deliverables/hooks'

type Mode = 'link' | 'video' | 'dual'

type Props = {
  mode?: Mode
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  onPickVideo?: () => void
  loading?: boolean
  submitLabel?: string
  videoStage?: VideoUploadStage
  compressionProgress?: number
  videoError?: string | null
}

const stageLabels: Record<VideoUploadStage, string> = {
  idle: '',
  compressing: 'Compressing video...',
  uploading: 'Uploading...',
  processing: 'Processing...',
  done: 'Video uploaded',
  error: 'Upload failed',
}

export function DeliverableInputRow({
  mode = 'link',
  value,
  onChangeText,
  onSubmit,
  onPickVideo,
  loading = false,
  submitLabel = 'Submit',
  videoStage = 'idle',
  compressionProgress = 0,
  videoError,
}: Props) {
  const [activeInput, setActiveInput] = useState<'link' | 'video'>(mode === 'video' ? 'video' : 'link')
  const showTabs = mode === 'dual'
  const showLink = mode === 'link' || activeInput === 'link'
  const showVideo = mode === 'video' || activeInput === 'video'
  const isBusy = videoStage === 'compressing' || videoStage === 'uploading' || videoStage === 'processing'

  return (
    <View style={{ gap: 10 }}>
      {showTabs ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            padding: 4,
            borderRadius: 16,
            backgroundColor: 'rgba(248,250,252,0.72)',
            borderWidth: 1,
            borderColor: 'rgba(15,23,42,0.06)',
          }}
        >
          <Pressable
            onPress={() => setActiveInput('link')}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: activeInput === 'link' ? '#fff' : 'transparent',
            }}
          >
            <Text
              style={{
                color: activeInput === 'link' ? palette.text : palette.textMuted,
                fontFamily: typography.fontFamily,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Paste link
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveInput('video')}
            style={{
              flex: 1,
              minHeight: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: activeInput === 'video' ? '#fff' : 'transparent',
            }}
          >
            <Text
              style={{
                color: activeInput === 'video' ? palette.text : palette.textMuted,
                fontFamily: typography.fontFamily,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              Upload video
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showLink ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder="Paste deliverable URL"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.8)',
              borderRadius: radii.input,
              paddingHorizontal: 12,
              height: 44,
              color: colors.foreground,
              fontSize: 14,
              backgroundColor: colors.background,
              fontFamily: typography.fontFamily,
            }}
          />
          <LiquidButton label={loading ? '...' : submitLabel} onPress={onSubmit} disabled={loading || !value.trim()} minHeight={44} borderRadius={radii.button} style={{ minWidth: 92 }} />
        </View>
      ) : null}

      {showVideo ? (
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={onPickVideo}
            disabled={isBusy || !onPickVideo}
            style={{
              minHeight: 50,
              borderRadius: radii.input,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: isBusy ? 'rgba(15,23,42,0.14)' : 'rgba(109,40,217,0.42)',
              backgroundColor: isBusy ? 'rgba(248,250,252,0.86)' : 'rgba(109,40,217,0.04)',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              paddingHorizontal: 14,
            }}
          >
            {isBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialCommunityIcons name="cloud-upload-outline" size={18} color={colors.primary} />}
            <Text
              style={{
                color: isBusy ? palette.textMuted : colors.primary,
                fontFamily: typography.fontFamily,
                fontSize: 13,
                fontWeight: '700',
              }}
            >
              {isBusy ? stageLabels[videoStage] : 'Choose video from library'}
            </Text>
          </Pressable>

          {videoStage === 'compressing' && compressionProgress > 0 ? (
            <View
              style={{
                height: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(109,40,217,0.12)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.max(4, Math.round(compressionProgress * 100))}%`,
                  height: '100%',
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          ) : null}

          {videoStage === 'done' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#16A34A" />
              <Text style={{ color: '#15803D', fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '700' }}>
                Video uploaded successfully
              </Text>
            </View>
          ) : null}

          {videoError ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', flex: 1 }}>
                {videoError}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
