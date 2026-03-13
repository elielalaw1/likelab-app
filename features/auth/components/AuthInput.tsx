import { Text, TextInput, View } from 'react-native'
import { authColors } from '@/features/auth/theme'

type Props = {
  label: string
  value: string
  onChangeText: (text: string) => void
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
      <Text style={{ fontSize: 11, color: authColors.muted, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <View
        style={{
          height: 50,
          borderWidth: 1,
          borderColor: authColors.border,
          borderRadius: 8,
          backgroundColor: '#fff',
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? <Text style={{ color: '#9ca3b2', fontSize: 16, marginRight: 2 }}>{prefixText}</Text> : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText(sanitizeText ? sanitizeText(text) : text)}
          placeholder={placeholder}
          placeholderTextColor="#9ca3b2"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: authColors.text,
          }}
        />
      </View>
    </View>
  )
}
