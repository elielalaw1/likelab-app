import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { palette, radii, shadows, typography } from '@/features/core/theme'

type Props = {
  activeCampaignsCount: number
  applicationsCount: number
  deliverablesCount: number
  onPressActive?: () => void
  onPressApplications?: () => void
  onPressDeliverables?: () => void
}

function StatItem({
  label,
  value,
  icon,
  tint,
  onPress,
}: {
  label: string
  value: number
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  tint: string
  onPress?: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flex: 1,
        borderRadius: 24,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(234,236,239,0.8)',
        padding: 16,
        gap: 12,
        ...shadows.card,
        opacity: onPress ? 1 : 0.96,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.text} />
      </View>
      <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </Pressable>
  )
}

export function ProfileStats({
  activeCampaignsCount,
  applicationsCount,
  deliverablesCount,
  onPressActive,
  onPressApplications,
  onPressDeliverables,
}: Props) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        Creator Summary
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem label="Active" value={activeCampaignsCount} icon="briefcase-outline" tint="rgba(16,185,129,0.14)" onPress={onPressActive} />
        <StatItem label="Applications" value={applicationsCount} icon="send-outline" tint="rgba(139,92,246,0.14)" onPress={onPressApplications} />
        <StatItem label="Deliverables" value={deliverablesCount} icon="package-variant-closed" tint="rgba(56,189,248,0.14)" onPress={onPressDeliverables} />
      </View>
    </View>
  )
}
