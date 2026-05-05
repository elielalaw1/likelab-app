import { Text, View } from 'react-native'
import { formatCurrencySek } from '@/features/core/format'
import { typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

type Props = { amount?: number | null; fallbackText?: string | null }

export function RewardBadge({ amount, fallbackText }: Props) {
  const { palette } = useTheme()
  const label = formatCurrencySek(amount) || fallbackText || ''
  if (!label) return null

  return (
    <View
      style={{
        backgroundColor: palette.glassStrong,
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', color: palette.text, fontSize: 14 }}>{label}</Text>
    </View>
  )
}
