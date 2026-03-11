import { Text, View } from 'react-native'
import { SectionCard } from '@/features/shared/ui/SectionCard'
import { palette, typography } from '@/features/core/theme'

type Props = {
  activeCampaignsCount: number
  applicationsCount: number
  deliverablesCount: number
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ color: palette.text, fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  )
}

export function ProfileStats({ activeCampaignsCount, applicationsCount, deliverablesCount }: Props) {
  return (
    <SectionCard title="Creator Summary">
      <View style={{ flexDirection: 'row' }}>
        <StatItem label="Active" value={activeCampaignsCount} />
        <View style={{ width: 1, backgroundColor: 'rgba(234,236,239,0.75)' }} />
        <StatItem label="Applications" value={applicationsCount} />
        <View style={{ width: 1, backgroundColor: 'rgba(234,236,239,0.75)' }} />
        <StatItem label="Deliverables" value={deliverablesCount} />
      </View>
    </SectionCard>
  )
}
