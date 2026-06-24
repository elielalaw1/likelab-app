import { useEffect, useMemo, useRef } from 'react'
import { View, Text } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { DeliverableFeedback, FeedbackKind } from '@/features/core/types'
import { useDeliverableFeedback, useMarkFeedbackRead } from '@/features/deliverables/hooks'

// Compact "x ago" — the table only stores created_at, no need for a date lib here.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(then).toLocaleDateString()
}

const KIND_STYLE: Record<FeedbackKind, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; bg: string; border: string }> = {
  revision_request: { label: 'CHANGES REQUESTED', icon: 'pencil-outline', accent: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  approval_note: { label: 'APPROVED', icon: 'check-decagram', accent: '#0F7B53', bg: '#ECFDF5', border: '#6EE7B7' },
  comment: { label: 'FEEDBACK', icon: 'message-text-outline', accent: redesign.color.purple, bg: redesign.color.card, border: redesign.color.hairlineStrong },
}

function authorLabel(role: DeliverableFeedback['authorRole']): string | null {
  switch (role) {
    case 'brand': return 'Brand'
    case 'admin': return 'LikeLab team'
    case 'creator': return 'You'
    default: return null // 'system' — backfilled legacy note, no author shown
  }
}

function FeedbackCard({ item }: { item: DeliverableFeedback }) {
  const style = KIND_STYLE[item.kind] ?? KIND_STYLE.comment
  const author = authorLabel(item.authorRole)

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: style.border, backgroundColor: style.bg, padding: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name={style.icon} size={14} color={style.accent} />
        <Text style={{ color: style.accent, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, fontFamily: typography.fontFamily }}>
          {style.label}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: redesign.color.faint, fontSize: 11, fontWeight: '500', fontFamily: typography.fontFamily }}>
          {[author, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={{ color: redesign.color.ink, fontSize: 14, lineHeight: 20, fontFamily: typography.fontFamily }}>
        {item.body}
      </Text>
    </View>
  )
}

// Renders the brand-feedback thread for one deliverable, newest first, and marks any
// unread rows as read once they're on screen. Returns null when there's nothing to show.
// `fallbackReason` keeps the legacy flag_reason visible if (for any reason) no feedback
// row exists yet — pass it only in the revision stage.
export function FeedbackThread({ deliverableId, fallbackReason }: { deliverableId: string; fallbackReason?: string | null }) {
  const { data: feedback } = useDeliverableFeedback(deliverableId)
  const markRead = useMarkFeedbackRead()
  const markedRef = useRef<Set<string>>(new Set())

  const items = useMemo(() => feedback ?? [], [feedback])

  useEffect(() => {
    const unread = items.filter((f) => !f.readAt && !markedRef.current.has(f.id))
    if (!unread.length) return
    unread.forEach((f) => markedRef.current.add(f.id))
    markRead.mutate(unread.map((f) => f.id))
  }, [items, markRead])

  if (items.length > 0) {
    return (
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <FeedbackCard key={item.id} item={item} />
        ))}
      </View>
    )
  }

  if (fallbackReason) {
    return (
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: KIND_STYLE.revision_request.border, backgroundColor: KIND_STYLE.revision_request.bg, padding: 12, gap: 6 }}>
        <Text style={{ color: KIND_STYLE.revision_request.accent, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, fontFamily: typography.fontFamily }}>
          {KIND_STYLE.revision_request.label}
        </Text>
        <Text style={{ color: '#9A3412', fontSize: 14, lineHeight: 20, fontFamily: typography.fontFamily }}>{fallbackReason}</Text>
      </View>
    )
  }

  return null
}
