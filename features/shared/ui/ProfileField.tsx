import { Text, TextInput, View } from 'react-native'
import { colors, radii, typography } from '@/features/core/theme'

type Props = {
  label: string
  value: string
  placeholder?: string
  onChangeText?: (value: string) => void
  editable?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
}

export function ProfileField({
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  keyboardType = 'default',
}: Props) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.formLabel,
          fontWeight: '600',
          letterSpacing: 0.88,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        editable={editable}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.8)',
          borderRadius: radii.input,
          height: 40,
          backgroundColor: editable ? colors.background : 'rgba(241,242,244,0.5)',
          paddingHorizontal: 12,
          fontSize: 14,
          color: colors.foreground,
          fontFamily: typography.fontFamily,
        }}
      />
    </View>
  )
}
