import { Text, TextInput, View } from 'react-native'
import { colors, radii, typography } from '@/features/core/theme'

type Props = {
  label: string
  value: string
  placeholder?: string
  onChangeText?: (value: string) => void
  editable?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  prefixText?: string
  sanitizeText?: (text: string) => string
}

export function ProfileField({
  label,
  value,
  placeholder,
  onChangeText,
  editable = true,
  keyboardType = 'default',
  prefixText,
  sanitizeText,
}: Props) {
  const displayValue = sanitizeText ? sanitizeText(value) : value

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
      <View
        style={{
          borderWidth: 1,
          borderColor: 'rgba(234,236,239,0.8)',
          borderRadius: radii.input,
          height: 40,
          backgroundColor: editable ? colors.background : 'rgba(241,242,244,0.5)',
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontFamily: typography.fontFamily, marginRight: 2 }}>{prefixText}</Text>
        ) : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText?.(sanitizeText ? sanitizeText(text) : text)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 14,
            color: colors.foreground,
            fontFamily: typography.fontFamily,
          }}
        />
      </View>
    </View>
  )
}
