import { Text, TextInput, View } from 'react-native'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { PHONE_CODE_OPTIONS } from '@/features/profile/location-data'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'

type Props = {
  code: string
  digits: string
  onChangeCode: (value: string) => void
  onChangeDigits: (value: string) => void
}

export function PhoneInput({ code, digits, onChangeCode, onChangeDigits }: Props) {
  const { colors, palette } = useTheme()
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
        Phone
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ width: 130 }}>
          <SelectPopover
            label="Code"
            value={code}
            options={PHONE_CODE_OPTIONS}
            placeholder="Select"
            searchable
            showLabel={false}
            onSelect={onChangeCode}
          />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <TextInput
            value={digits}
            onChangeText={(value) => onChangeDigits(value.replace(/[^\d]/g, ''))}
            keyboardType="phone-pad"
            placeholder="70 123 4567"
            placeholderTextColor={palette.textMuted}
            style={{
              borderWidth: 1,
              borderColor: palette.borderColor,
              borderRadius: radii.input,
              height: 40,
              backgroundColor: palette.inputBg,
              paddingHorizontal: 12,
              fontSize: 14,
              color: palette.text,
              fontFamily: typography.fontFamily,
            }}
          />
        </View>
      </View>
    </View>
  )
}
