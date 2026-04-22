import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { authColors } from '@/features/auth/theme'

type Props = {
  label: string
  value: string
  onChangeText: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder: string
  secureTextEntry?: boolean
  showToggle?: boolean
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
  showToggle = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  prefixText,
  sanitizeText,
}: Props) {
  const [visible, setVisible] = useState(false)
  const displayValue = sanitizeText ? sanitizeText(value) : value
  const isSecure = secureTextEntry && !visible

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
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: authColors.text,
            ...(isSecure ? null : { fontFamily: authColors.typography.fontFamily }),
          }}
        />
        {showToggle && secureTextEntry ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={authColors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
