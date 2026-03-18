import { Text, TextInput, View } from 'react-native'
import { authColors } from '@/features/auth/theme'

type Props = {
  label: string
  value: string
  onChangeText: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address'
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters'
  prefixText?: string
  sanitizeText?: (text: string) => string
}

export function AuthInput({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  prefixText,
  sanitizeText,
}: Props) {
  const displayValue = sanitizeText ? sanitizeText(value) : value

  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 11,
          color: authColors.muted,
          fontWeight: '700',
          letterSpacing: 0.88,
          textTransform: 'uppercase',
          fontFamily: authColors.typography.fontFamily,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          height: 50,
          borderWidth: 1,
          borderColor: authColors.border,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.92)',
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? (
          <Text style={{ color: authColors.muted, fontSize: 16, marginRight: 2, fontFamily: authColors.typography.fontFamily }}>{prefixText}</Text>
        ) : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText(sanitizeText ? sanitizeText(text) : text)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: authColors.text,
            ...(secureTextEntry ? null : { fontFamily: authColors.typography.fontFamily }),
          }}
        />
      </View>
    </View>
  )
}
