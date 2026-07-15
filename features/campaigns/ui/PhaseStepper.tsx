import { Text, View } from 'react-native'
import { redesign, typography } from '@/features/core/theme'
import { PHASE_LABELS, phaseColors } from '@/features/campaigns/phase'
import type { CampaignPhase } from '@/features/core/types'

const PHASE_ORDER: CampaignPhase[] = [
  'brief_upload',
  'application_period',
  'creator_selection',
  'product_sendout',
  'filming_period',
  'video_selection',
  'posting',
]

// Compact 7-dot progress row. `notSelected` swaps the dots for a single flat badge
// — a rejected/passed-over creator isn't progressing through the remaining phases,
// so dots implying "upcoming steps" would be misleading.
export function PhaseStepper({ phase, notSelected }: { phase: CampaignPhase | null | undefined; notSelected?: boolean }) {
  if (notSelected) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#6B6B76' }} />
        <Text style={{ color: '#6B6B76', fontSize: 12, fontWeight: '800', fontFamily: typography.fontFamily }}>Not selected</Text>
      </View>
    )
  }

  const currentIndex = phase ? PHASE_ORDER.indexOf(phase) : -1

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {PHASE_ORDER.map((p, i) => {
        const passed = currentIndex >= 0 && i < currentIndex
        const current = i === currentIndex
        const color = current ? phaseColors(p).text : passed ? redesign.color.purple : redesign.color.hairlineStrong
        return (
          <View
            key={p}
            style={{
              width: current ? 9 : 7,
              height: current ? 9 : 7,
              borderRadius: 5,
              backgroundColor: passed || current ? color : 'transparent',
              borderWidth: passed || current ? 0 : 1.5,
              borderColor: redesign.color.hairlineStrong,
            }}
          />
        )
      })}
      {phase ? (
        <Text style={{ marginLeft: 4, color: redesign.color.muted, fontSize: 11.5, fontWeight: '700', fontFamily: typography.fontFamily }}>
          {PHASE_LABELS[phase]}
        </Text>
      ) : null}
    </View>
  )
}
