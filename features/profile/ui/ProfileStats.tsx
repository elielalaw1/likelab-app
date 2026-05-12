import { Pressable, Text, View } from 'react-native'
import { shadows, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

type Props = {
  activeCampaignsCount: number
  applicationsCount: number
  deliverablesCount: number
  onPressActive?: () => void
  onPressApplications?: () => void
  onPressDeliverables?: () => void
}

export function ProfileStats({
  activeCampaignsCount,
  applicationsCount,
  deliverablesCount,
  onPressActive,
  onPressApplications,
  onPressDeliverables,
}: Props) {
  const { palette } = useTheme()
  const stats = [
    { label: 'Active', value: activeCampaignsCount, onPress: onPressActive },
    { label: 'Applications', value: applicationsCount, onPress: onPressApplications },
    { label: 'Deliverables', value: deliverablesCount, onPress: onPressDeliverables },
  ]
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 20,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.borderColor,
        ...shadows.card,
        overflow: 'hidden',
      }}
    >
      {stats.map((stat, i) => (
        <Pressable
          key={stat.label}
          onPress={stat.onPress}
          disabled={!stat.onPress}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderLeftWidth: i > 0 ? 1 : 0,
            borderLeftColor: palette.borderColor,
          }}
        >
          <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
            {stat.value}
          </Text>
          <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', marginTop: 2 }}>
            {stat.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
