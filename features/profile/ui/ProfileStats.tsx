import { Pressable, Text, View } from 'react-native'
import { typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'
import { GlassCard } from '@/features/shared/ui/GlassCard'

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
    <GlassCard radius={20} intensity={24}>
      <View style={{ flexDirection: 'row' }}>
        {stats.map((stat, i) => (
          <Pressable
            key={stat.label}
            onPress={stat.onPress}
            disabled={!stat.onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 14,
              borderLeftWidth: i > 0 ? 0.5 : 0,
              borderLeftColor: 'rgba(255,255,255,0.7)',
            }}
          >
            <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
              {stat.value}
            </Text>
            <Text style={{ color: 'rgba(28,28,30,0.35)', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '700', marginTop: 4, letterSpacing: 1.8, textTransform: 'uppercase' }}>
              {stat.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </GlassCard>
  )
}
