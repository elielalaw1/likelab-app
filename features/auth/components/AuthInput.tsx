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
}

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: Props) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, color: authColors.muted, fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3b2"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={{
          height: 50,
          borderWidth: 1,
          borderColor: authColors.border,
          borderRadius: 8,
          paddingHorizontal: 14,
          fontSize: 16,
          color: authColors.text,
          backgroundColor: '#fff',
        }}
      />
    </View>
  )
}
