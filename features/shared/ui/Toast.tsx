import { useCallback, useEffect, useState } from 'react'
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; type: ToastType; message: string; key?: string; count: number }

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null

// Monotonic id counter. Date.now() collides for two toasts emitted in the same
// millisecond, which makes dismiss() remove both and React warn on duplicate keys.
let nextId = 0

// Longer messages need more time to actually read, not a fixed 3.2s regardless of
// length — this was the core complaint: a real message ("You have a new video
// deliverable in...") was gone before it could be read.
const MIN_DURATION_MS = 3600
const MAX_DURATION_MS = 6500
const MS_PER_CHAR = 55

function durationFor(message: string) {
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, message.length * MS_PER_CHAR))
}

function emit(type: ToastType, message: string, key?: string) {
  if (type === 'success') haptic.success()
  else if (type === 'error') haptic.error()
  else haptic.light()
  // Announce to screen readers — the toast is otherwise silent to VoiceOver/
  // TalkBack users (works on both iOS and Android, unlike accessibilityRole alone).
  AccessibilityInfo.announceForAccessibility(message)
  _setToasts?.((prev) => {
    // Coalesce a burst of the same kind of event (e.g. 10 "new deliverable assigned"
    // pushes arriving back-to-back for a batch assignment) into ONE toast with a
    // count, instead of queuing 10 near-identical toasts the creator can't keep up
    // with reading. Only merges into the most recent still-pending entry.
    const last = prev[prev.length - 1]
    if (key && last?.key === key) {
      return [...prev.slice(0, -1), { ...last, message, count: last.count + 1 }]
    }
    return [...prev, { id: ++nextId, type, message, key, count: 1 }]
  })
}

export const toast = {
  success: (message: string, key?: string) => emit('success', message, key),
  error: (message: string, key?: string) => emit('error', message, key),
  info: (message: string, key?: string) => emit('info', message, key),
}

// Same "icon-in-a-tinted-chip + ink text on a white card" language used everywhere
// else in the app (CreatorActionCard, ProfilePendingGate, etc.) — the color signals
// through a small chip, not by painting the whole bubble and its text in a pastel/
// saturated hue. That full-bleed-color-bubble look (esp. the old `info` variant:
// lavender fill + solid purple text) was the app's clearest remaining "AI toast"
// fingerprint.
const CONFIG: Record<ToastType, { icon: string; iconColor: string; chipBg: string }> = {
  success: { icon: 'check-circle', iconColor: redesign.color.successText, chipBg: redesign.color.successBg },
  error: { icon: 'alert-circle', iconColor: '#DC2626', chipBg: 'rgba(220,38,38,0.10)' },
  info: { icon: 'information-outline', iconColor: redesign.color.purple, chipBg: 'rgba(99,80,184,0.10)' },
}

function ToastRow({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const c = CONFIG[item.type]
  useEffect(() => {
    // Re-armed whenever `item` changes identity (new message merged in via
    // coalescing bumps `count`, which is part of the item) — a fresh read gets a
    // fresh timer instead of the clock quietly running out mid-merge.
    const t = setTimeout(() => onDone(item.id), durationFor(item.message))
    return () => clearTimeout(t)
  }, [item, onDone])

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(200).mass(0.8)}
      exiting={FadeOutUp.duration(200)}
      accessibilityLiveRegion="polite"
    >
      <Pressable
        onPress={() => onDone(item.id)}
        accessibilityRole="button"
        accessibilityHint="Dismiss"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: redesign.color.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: redesign.color.hairlineStrong,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          ...redesign.shadow.card,
        }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.chipBg, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={c.icon as never} size={17} color={c.iconColor} />
        </View>
        <Text style={{ flex: 1, color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '600', lineHeight: 19 }}>
          {item.message}
          {item.count > 1 ? ` ×${item.count}` : ''}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const insets = useSafeAreaInsets()
  const top = insets.top + 8

  useEffect(() => {
    _setToasts = setToasts
    return () => { _setToasts = null }
  }, [])

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), [])

  if (!toasts.length) return null

  // Only the OLDEST toast renders — the rest sit queued and silent. Showing up to
  // three stacked toasts at once (the previous behavior) was the other half of the
  // complaint: several real messages competing for attention and each individually
  // too rushed to read. One at a time, fully read, then the next.
  const current = toasts[0]

  return (
    <View style={{ position: 'absolute', top, left: 16, right: 16 }} pointerEvents="box-none">
      <ToastRow key={current.id} item={current} onDone={dismiss} />
    </View>
  )
}
