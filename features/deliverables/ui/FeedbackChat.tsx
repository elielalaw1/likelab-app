import { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, Modal, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { DeliverableFeedback } from '@/features/core/types'
import { useDeliverableFeedback, useMarkFeedbackRead } from '@/features/deliverables/hooks'

// Compact "x ago" — the table only stores created_at, no need for a date lib.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then) || !iso) return ''
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(then).toLocaleDateString()
}

function BrandAvatar({ name, logoUrl, size }: { name?: string | null; logoUrl?: string | null; size: number }) {
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: redesign.color.hairlineStrong }} />
  }
  const initial = (name || 'B').trim().charAt(0).toUpperCase()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: redesign.color.purple, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42, fontFamily: typography.fontFamily }}>{initial}</Text>
    </View>
  )
}

// SMS-style conversation. All messages are incoming (brand → creator), so every bubble is
// left-aligned. Brand logo + name sit in the header like a chat thread.
function FeedbackChatModal({
  visible,
  onClose,
  items,
  brandName,
  brandLogoUrl,
}: {
  visible: boolean
  onClose: () => void
  items: DeliverableFeedback[]
  brandName?: string | null
  brandLogoUrl?: string | null
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        {/* Header */}
        <View style={{ paddingTop: insets.top + 6, paddingBottom: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: redesign.color.hairlineStrong, backgroundColor: redesign.color.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={onClose} hitSlop={12} style={{ width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="chevron-down" size={28} color={redesign.color.muted} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <BrandAvatar name={brandName} logoUrl={brandLogoUrl} size={52} />
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>
                {brandName || 'Brand'}
              </Text>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '500', color: redesign.color.muted }}>
                Feedback on your video
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        >
          {items.map((item) => {
            const when = timeAgo(item.createdAt)
            return (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '86%' }}>
                <BrandAvatar name={brandName} logoUrl={brandLogoUrl} size={26} />
                <View style={{ gap: 3, flexShrink: 1 }}>
                  <View style={{ backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 14, paddingVertical: 10 }}>
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, lineHeight: 21, color: redesign.color.ink }}>
                      {item.body}
                    </Text>
                  </View>
                  {when ? (
                    <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, color: redesign.color.faint, marginLeft: 6 }}>{when}</Text>
                  ) : null}
                </View>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

// Pulsing chat button that surfaces brand feedback. Shows a halo + a "you've got feedback"
// callout while there's unread feedback; tapping opens the SMS-style thread and marks read.
// Renders nothing when there's no feedback (and no legacy fallback reason).
export function FeedbackButton({
  deliverableId,
  brandName,
  brandLogoUrl,
  fallbackReason,
}: {
  deliverableId: string
  brandName?: string | null
  brandLogoUrl?: string | null
  fallbackReason?: string | null
}) {
  const { data: feedback } = useDeliverableFeedback(deliverableId)
  const markRead = useMarkFeedbackRead()
  const [open, setOpen] = useState(false)

  const items = useMemo<DeliverableFeedback[]>(() => {
    const rows = feedback ?? []
    if (rows.length) return rows
    // Legacy fallback: a flag_reason with no feedback row yet → synthesize one bubble.
    if (fallbackReason) {
      return [{ id: 'fallback', deliverableId, submissionId: null, authorRole: 'brand', body: fallbackReason, readAt: null, createdAt: '' }]
    }
    return []
  }, [feedback, fallbackReason, deliverableId])

  const unread = useMemo(() => items.filter((f) => f.id !== 'fallback' && !f.readAt).length, [items])
  const hasUnread = unread > 0

  // Pulse animation — only while there's unread feedback.
  const pulse = useSharedValue(0)
  useEffect(() => {
    if (hasUnread) {
      pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }), withTiming(0, { duration: 0 })), -1, false)
    } else {
      cancelAnimation(pulse)
      pulse.value = 0
    }
    return () => cancelAnimation(pulse)
  }, [hasUnread, pulse])

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.9 }],
    opacity: 0.45 * (1 - pulse.value),
  }))
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.15 }] }))

  if (!items.length) return null

  const openThread = () => {
    setOpen(true)
    if (hasUnread) {
      const ids = items.filter((f) => f.id !== 'fallback' && !f.readAt).map((f) => f.id)
      if (ids.length) markRead.mutate(ids)
    }
  }

  const accent = hasUnread ? redesign.color.purple : redesign.color.muted

  return (
    <View style={{ gap: 8 }}>
      {/* "You've got feedback" callout */}
      {hasUnread ? (
        <Animated.View entering={FadeInDown.duration(350)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: redesign.color.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
          <MaterialCommunityIcons name="message-badge" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '700' }}>
            New feedback from {brandName || 'the brand'}
          </Text>
        </Animated.View>
      ) : null}

      <Pressable onPress={openThread} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: hasUnread ? redesign.color.purple : redesign.color.hairlineStrong, backgroundColor: hasUnread ? 'rgba(99,80,184,0.08)' : redesign.color.card, paddingLeft: 8, paddingRight: 16, paddingVertical: 8 }}>
        {/* Pulsing chat icon */}
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          {hasUnread ? (
            <Animated.View style={[{ position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: redesign.color.purple }, haloStyle]} />
          ) : null}
          <Animated.View style={[{ width: 34, height: 34, borderRadius: 17, backgroundColor: hasUnread ? redesign.color.purple : redesign.color.hairlineStrong, alignItems: 'center', justifyContent: 'center' }, dotStyle]}>
            <MaterialCommunityIcons name="message-text" size={18} color={hasUnread ? '#fff' : redesign.color.muted} />
          </Animated.View>
        </View>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700', color: hasUnread ? redesign.color.purple : redesign.color.ink }}>
          {hasUnread ? `${unread} new` : 'View feedback'}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={accent} />
      </Pressable>

      <FeedbackChatModal
        visible={open}
        onClose={() => setOpen(false)}
        items={items}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
      />
    </View>
  )
}
