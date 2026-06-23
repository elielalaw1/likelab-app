import { StyleSheet, Text, TextInput, View } from 'react-native'
import { redesign, typography } from '@/features/core/theme'

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
    <View style={{ gap: 7 }}>
      <Text
        style={{
          color: redesign.color.faint,
          fontFamily: typography.fontFamily,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1.0,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: redesign.color.hairlineStrong,
          borderRadius: 14,
          height: 48,
          backgroundColor: editable ? redesign.color.card : redesign.color.bg,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? (
          <Text style={{ color: redesign.color.muted, fontSize: 15, fontFamily: typography.fontFamily, marginRight: 2 }}>{prefixText}</Text>
        ) : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText?.(sanitizeText ? sanitizeText(text) : text)}
          placeholder={placeholder}
          placeholderTextColor={redesign.color.faint}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: editable ? redesign.color.ink : redesign.color.muted,
            fontFamily: typography.fontFamily,
          }}
        />
      </View>
    </View>
  )
}
