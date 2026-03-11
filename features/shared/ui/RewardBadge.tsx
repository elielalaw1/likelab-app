import { Text, View } from 'react-native'
import { formatCurrencySek } from '@/features/core/format'
import { colors, typography } from '@/features/core/theme'

type Props = { amount?: number | null; fallbackText?: string | null }

export function RewardBadge({ amount, fallbackText }: Props) {
  const label = formatCurrencySek(amount) || fallbackText || ''
  if (!label) return null

  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        alignSelf: 'flex-start',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontFamily: typography.fontFamily, fontWeight: '700', color: colors.foreground, fontSize: 14 }}>{label}</Text>
    </View>
  )
}
