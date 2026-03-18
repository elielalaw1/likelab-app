import { Text, View } from 'react-native'
import { colors, palette, radii, typography } from '@/features/core/theme'

type Props = { status?: string | null }

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  draft: { bg: 'hsl(220 10% 95%)', text: colors.mutedForeground, label: 'DRAFT' },
  withdrawn: { bg: 'hsl(220 10% 95%)', text: colors.mutedForeground, label: 'WITHDRAWN' },
  ended: { bg: 'hsl(220 10% 95%)', text: colors.mutedForeground, label: 'ENDED' },
  published: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  completed: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  accepted: { bg: palette.successBg, text: palette.successText, label: 'ACCEPTED' },
  approved: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  open: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  creating: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  reviewing: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
  uploaded: { bg: palette.successBg, text: palette.successText, label: 'SUBMITTED' },
  applied: { bg: '#FEF3C7', text: '#B45309', label: 'APPLIED' },
  pending: { bg: '#F3F4F6', text: '#6B7280', label: 'AWAITING SUBMISSION' },
  submitted: { bg: palette.successBg, text: palette.successText, label: 'SUBMITTED' },
  flagged: { bg: '#FEE2E2', text: '#B91C1C', label: 'FLAGGED' },
  pending_review: { bg: '#FEF3C7', text: '#B45309', label: 'UNDER REVIEW' },
  paused: { bg: '#FEF3C7', text: '#B45309', label: 'PAUSED' },
  invited: { bg: '#EDE9FE', text: '#6D28D9', label: 'INVITED' },
  cancelled: { bg: '#FEE2E2', text: '#B91C1C', label: 'CANCELLED' },
  rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'REJECTED' },
  declined: { bg: '#FEE2E2', text: '#B91C1C', label: 'DECLINED' },
  revision_requested: { bg: '#FFEDD5', text: '#C2410C', label: 'REVISION REQUESTED' },
}

export function StatusBadge({ status }: Props) {
  const raw = (status || '').toLowerCase().trim()
  const mapped = statusMap[raw]
  const label = mapped?.label || raw.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'

  return (
    <View style={{ backgroundColor: mapped?.bg || 'hsl(220 10% 95%)', borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Text
        style={{
          color: mapped?.text || colors.mutedForeground,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.badge,
          fontWeight: '600',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  )
}
