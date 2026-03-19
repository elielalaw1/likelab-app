import { Pressable, Text, TextInput, View } from 'react-native'
import { colors, radii, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'

type Props = {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  loading?: boolean
}

export function DeliverableInput({ value, onChangeText, onSubmit, loading = false }: Props) {
  return (
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
      <LiquidButton label={loading ? '...' : 'Submit'} onPress={onSubmit} disabled={loading} minHeight={44} borderRadius={radii.button} style={{ minWidth: 92 }} />
    </View>
  )
}
