import { Text, View } from 'react-native'
import { radii, typography } from '@/features/core/theme'
import { useTheme } from '@/features/core/useTheme'

type Props = { status?: string | null }

export function StatusBadge({ status }: Props) {
  const { palette } = useTheme()

  const statusMap: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    draft: { bg: palette.neutralBg, text: palette.neutralText, label: 'DRAFT' },
    withdrawn: { bg: palette.neutralBg, text: palette.neutralText, label: 'WITHDRAWN' },
    ended: { bg: palette.neutralBg, text: palette.neutralText, label: 'ENDED' },
    published: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    completed: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    accepted: { bg: palette.successBg, text: palette.successText, label: 'ACCEPTED' },
    approved: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    open: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    creating: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    reviewing: { bg: palette.successBg, text: palette.successText, label: 'ACTIVE' },
    uploaded: { bg: palette.successBg, text: palette.successText, label: 'SUBMITTED' },
    applied: { bg: palette.warningBg, text: palette.warningText, label: 'APPLIED' },
    pending: { bg: palette.warningBg, text: palette.warningText, label: 'PENDING REVIEW' },
    submitted: { bg: palette.successBg, text: palette.successText, label: 'SUBMITTED' },
    flagged: { bg: palette.dangerBg, text: palette.dangerText, label: 'FLAGGED' },
    pending_review: { bg: palette.warningBg, text: palette.warningText, label: 'UNDER REVIEW' },
    paused: { bg: palette.warningBg, text: palette.warningText, label: 'PAUSED' },
    invited: { bg: '#EDE9FE', text: '#6D28D9', label: 'INVITED' },
    cancelled: { bg: palette.dangerBg, text: palette.dangerText, label: 'CANCELLED' },
    rejected: { bg: palette.dangerBg, text: palette.dangerText, label: 'REJECTED' },
    declined: { bg: palette.dangerBg, text: palette.dangerText, label: 'DECLINED' },
    revision_requested: { bg: palette.warningBg, text: palette.warningText, label: 'REVISION REQUESTED' },
  }

  const raw = (status || '').toLowerCase().trim()
  const mapped = statusMap[raw]
  const label = mapped?.label || raw.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'

  return (
    <View
      style={{
        backgroundColor: mapped?.bg || palette.neutralBg,
        borderRadius: radii.full,
        paddingHorizontal: 12,
        minHeight: 30,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: mapped?.text || palette.neutralText,
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
