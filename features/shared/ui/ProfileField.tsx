import { Text, TextInput, View } from 'react-native'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

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
  const { colors, palette } = useTheme()
  const displayValue = sanitizeText ? sanitizeText(value) : value

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: palette.textMuted,
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
          borderColor: palette.borderColor,
          borderRadius: radii.input,
          height: 40,
          backgroundColor: editable ? palette.inputBg : palette.neutralBg,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? (
          <Text style={{ color: palette.textMuted, fontSize: 14, fontFamily: typography.fontFamily, marginRight: 2 }}>{prefixText}</Text>
        ) : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText?.(sanitizeText ? sanitizeText(text) : text)}
          placeholder={placeholder}
          placeholderTextColor={palette.textMuted}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 14,
            color: palette.text,
            fontFamily: typography.fontFamily,
          }}
        />
      </View>
    </View>
  )
}
