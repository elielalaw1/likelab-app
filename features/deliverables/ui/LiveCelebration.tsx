import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import type { Deliverable } from '@/features/core/types'
import { useDeliverables } from '@/features/deliverables/hooks'
import { getCelebratedLiveIds, setCelebratedLiveIds } from '@/features/deliverables/liveCelebration'

// Sky-blue accent (matches STAGE_UI.live) — a restrained, on-brand palette, not rainbow.
const SKY = '#0EA5E9'
const CONFETTI_COLORS = ['#0EA5E9', '#38BDF8', '#67D8F5', '#BAE6FD', '#FFFFFF']

// The uploaded video's own live poster/status pill "stamps" in with a spring, then the
// LIVE dot keeps breathing — the payoff of the whole flow.
function LiveStamp() {
  const dot = useSharedValue(0)
  useEffect(() => {
    dot.value = withDelay(300, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })), -1, false))
  }, [dot])
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.5 + dot.value * 0.5, transform: [{ scale: 1 + dot.value * 0.5 }] }))
  return (
    <Animated.View entering={ZoomIn.springify().damping(11).mass(0.7)} style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: 'rgba(14,165,233,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(14,165,233,0.4)' }}>
      <MaterialCommunityIcons name="star-four-points" size={40} color={SKY} />
      <View style={{ position: 'absolute', bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: SKY, borderRadius: 999, paddingLeft: 6, paddingRight: 8, paddingVertical: 3 }}>
        <Animated.View style={[dotStyle, { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }]} />
        <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 }}>LIVE</Text>
      </View>
    </Animated.View>
  )
}

function LiveModal({ count, onClose }: { count: number; onClose: () => void }) {
  const { width } = useWindowDimensions()
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,8,15,0.78)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon count={150} origin={{ x: width / 2, y: -20 }} colors={CONFETTI_COLORS} autoStart fadeOut explosionSpeed={470} fallSpeed={4200} />
          <ConfettiCannon count={80} origin={{ x: 0, y: 90 }} colors={CONFETTI_COLORS} autoStart fadeOut explosionSpeed={410} fallSpeed={4000} />
          <ConfettiCannon count={80} origin={{ x: width, y: 90 }} colors={CONFETTI_COLORS} autoStart fadeOut explosionSpeed={410} fallSpeed={4000} />
        </View>

        <Animated.View
          entering={ZoomIn.springify().damping(14).mass(0.7)}
          style={{ width: '100%', maxWidth: 360, backgroundColor: redesign.color.card, borderRadius: 30, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 24, alignItems: 'center', gap: 14, ...redesign.shadow.cta }}
        >
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '900', color: redesign.color.faint, letterSpacing: 2, textTransform: 'uppercase' }}>You&apos;re live</Text>

          <LiveStamp />

          <View style={{ alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '900', color: redesign.color.ink, letterSpacing: -0.8, textAlign: 'center' }}>
              {count > 1 ? `${count} videos are live` : 'Your video is live'}
            </Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: redesign.color.muted, textAlign: 'center', lineHeight: 20, marginTop: 2 }}>
              It&apos;s out in the world now — nice work. Your stats will start rolling in.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={{ alignSelf: 'stretch', minHeight: 52, borderRadius: 16, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
          >
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800' }}>Nice</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

// A deliverable is live once it carries a public link or is published — matches the
// `live` stage in both the review and direct-delivery flows.
function isLive(d: Deliverable): boolean {
  return !!d.url || d.status === 'published'
}

// Mounted once inside the authed tabs tree. Watches the creator's deliverables and fires
// a one-time celebration the moment one (or more) newly goes live. On first ever load it
// silently seeds the current live set as the baseline — no celebration for videos that
// were already live before this shipped.
export function LiveCelebrationHost() {
  const { data: deliverables, isFetched } = useDeliverables()
  const [count, setCount] = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!isFetched || !deliverables || busy.current) return
    busy.current = true
    let active = true
    const liveIds = deliverables.filter(isLive).map((d) => d.id)

    getCelebratedLiveIds()
      .then((seen) => {
        if (!active) return
        if (seen == null) {
          void setCelebratedLiveIds(liveIds) // baseline — never celebrate pre-existing live videos
          return
        }
        const seenSet = new Set(seen)
        const fresh = liveIds.filter((id) => !seenSet.has(id))
        // Persist the current live set either way (keeps storage bounded, never re-fires).
        void setCelebratedLiveIds(liveIds)
        if (fresh.length > 0) {
          haptic.success()
          setCount(fresh.length)
        }
      })
      .finally(() => {
        busy.current = false
      })
    return () => {
      active = false
    }
  }, [isFetched, deliverables])

  if (count < 1) return null
  return <LiveModal count={count} onClose={() => setCount(0)} />
}
