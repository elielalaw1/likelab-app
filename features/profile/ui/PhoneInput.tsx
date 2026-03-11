import { Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radii, typography } from '@/features/core/theme'
import { PHONE_CODE_OPTIONS } from '@/features/profile/location-data'
import { SelectPopover } from '@/features/profile/ui/SelectPopover'

type Props = {
  code: string
  digits: string
  savedPhone?: string | null
  onChangeCode: (value: string) => void
  onChangeDigits: (value: string) => void
}

export function PhoneInput({ code, digits, savedPhone, onChangeCode, onChangeDigits }: Props) {
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
        Phone
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ width: 130 }}>
          <SelectPopover
            label="Code"
            value={code}
            options={PHONE_CODE_OPTIONS}
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
            placeholderTextColor={colors.mutedForeground}
            style={{
              borderWidth: 1,
              borderColor: 'rgba(234,236,239,0.8)',
              borderRadius: radii.input,
              height: 40,
              backgroundColor: colors.background,
              paddingHorizontal: 12,
              fontSize: 14,
              color: colors.foreground,
              fontFamily: typography.fontFamily,
            }}
          />
        </View>
      </View>

      {savedPhone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="phone-outline" size={14} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: typography.fontFamily }}>{savedPhone}</Text>
        </View>
      ) : null}
    </View>
  )
}
