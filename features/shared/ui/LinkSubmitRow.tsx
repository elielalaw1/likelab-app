import { useState } from 'react'
import { Alert, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { haptic } from '@/features/shared/haptics'
import { useSubmitLink } from '@/features/deliverables/hooks'
import { isValidTikTokUrl } from '@/lib/validate-tiktok-url'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  deliverableId: string
  submitLabel?: string
}

export function LinkSubmitRow({ deliverableId, submitLabel = 'Submit link' }: Props) {
  const { palette } = useTheme()
  const [url, setUrl] = useState('')
  const { mutateAsync, isPending } = useSubmitLink()

  const trimmed = url.trim()
  const canSubmit = !isPending && isValidTikTokUrl(trimmed)

  const handleSubmit = async () => {
    if (!isValidTikTokUrl(trimmed)) {
      Alert.alert('Invalid TikTok link', 'Please paste the full link to your TikTok video — it should start with https:// and contain tiktok.com.')
      return
    }
    haptic.light()
    try {
      await mutateAsync({ deliverableId, url: trimmed })
      haptic.success()
    } catch (submitError) {
      haptic.warning()
      Alert.alert(
        'Submission failed',
        submitError instanceof Error ? submitError.message : 'Could not submit your link. Please try again.'
      )
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://www.tiktok.com/@you/video/…"
        placeholderTextColor={palette.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        editable={!isPending}
        onSubmitEditing={handleSubmit}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: radii.input,
          borderWidth: 1,
          borderColor: palette.borderColor,
          backgroundColor: palette.inputBg,
          color: palette.text,
          fontSize: 14,
          fontFamily: typography.fontFamily,
        }}
      />
      <LiquidButton
        label={isPending ? 'Submitting…' : submitLabel}
        onPress={handleSubmit}
        disabled={!canSubmit}
        minHeight={48}
        borderRadius={radii.button}
        icon={<MaterialCommunityIcons name="link-variant" size={18} color="#fff" />}
      />
    </View>
  )
}
