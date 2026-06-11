import { Text, View } from 'react-native'
import { radii, typography } from '@/features/core/theme'
import type { CampaignPhase } from '@/features/core/types'
import { PHASE_LABELS, phaseColors } from '@/features/campaigns/phase'

type Props = { phase?: CampaignPhase | null }

export function CampaignPhaseBadge({ phase }: Props) {
  if (!phase) return null

  const { bg, text } = phaseColors(phase)
  const label = PHASE_LABELS[phase] || phase.replace(/_/g, ' ')

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.full,
        paddingHorizontal: 12,
        minHeight: 30,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: text,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.badge,
          fontWeight: '600',
          lineHeight: 14,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
