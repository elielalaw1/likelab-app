import { Pressable, Text, TextInput, View } from 'react-native'
import { colors, radii, typography } from '@/features/core/theme'

type Props = {
  value: string
  onChangeText: (value: string) => void
  onSubmit: () => void
  loading?: boolean
}

export function DeliverableInputRow({ value, onChangeText, onSubmit, loading = false }: Props) {
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
      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={{
          backgroundColor: colors.primary,
          minWidth: 92,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.button,
          opacity: loading ? 0.5 : 1,
        }}
      >
        <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 14, fontFamily: typography.fontFamily }}>
          {loading ? '...' : 'Submit'}
        </Text>
      </Pressable>
    </View>
  )
}
