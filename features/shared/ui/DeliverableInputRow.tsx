import { Pressable, Text, TextInput, View } from 'react-native'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  loading?: boolean
  submitLabel?: string
}

export function DeliverableInputRow({
  value,
  onChangeText,
  onSubmit,
  loading = false,
  submitLabel = 'Submit',
}: Props) {
  const { colors, palette } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Paste TikTok URL"
        placeholderTextColor={palette.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: palette.borderColor,
          borderRadius: radii.input,
          paddingHorizontal: 12,
          height: 44,
          color: palette.text,
          fontSize: 14,
          backgroundColor: palette.inputBg,
          fontFamily: typography.fontFamily,
        }}
      />
      <LiquidButton
        label={loading ? '...' : submitLabel}
        onPress={onSubmit}
        disabled={loading || !value.trim()}
        minHeight={44}
        borderRadius={radii.button}
        style={{ minWidth: 92 }}
      />
    </View>
  )
}
