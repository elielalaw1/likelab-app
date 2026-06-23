import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { authColors } from '@/features/auth/theme'
import { redesign } from '@/features/core/theme'

type Props = {
  label: string
  value: string
  onChangeText: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder: string
  secureTextEntry?: boolean
  showToggle?: boolean
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'
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
    <View style={{ gap: 7 }}>
      <Text
        style={{
          fontSize: 10,
          color: redesign.color.faint,
          fontWeight: '800',
          letterSpacing: 1.0,
          textTransform: 'uppercase',
          fontFamily: authColors.typography.fontFamily,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          height: 52,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: redesign.color.hairlineStrong,
          borderRadius: 14,
          backgroundColor: redesign.color.card,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {prefixText ? (
          <Text style={{ color: redesign.color.muted, fontSize: 16, marginRight: 2, fontFamily: authColors.typography.fontFamily }}>{prefixText}</Text>
        ) : null}
        <TextInput
          value={displayValue}
          onChangeText={(text) => onChangeText(sanitizeText ? sanitizeText(text) : text)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={redesign.color.faint}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 16,
            color: redesign.color.ink,
            ...(isSecure ? null : { fontFamily: authColors.typography.fontFamily }),
          }}
        />
        {showToggle && secureTextEntry ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={redesign.color.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
