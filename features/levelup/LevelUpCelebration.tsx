import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, { ZoomIn } from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { redesign, typography } from '@/features/core/theme'
import { haptic } from '@/features/shared/haptics'
import { getCreatorLevel } from '@/features/profile/api'
import { TIERS, type Tier } from '@/features/profile/tiers'
import { TierRing } from '@/features/profile/ui/TierBadge'
import { getLastCelebratedLevel, setLastCelebratedLevel } from '@/features/levelup/levelUp'
import { useCelebrationSlot } from '@/features/shared/celebrationSlot'

const glyph = (name: string) => name as keyof typeof MaterialCommunityIcons.glyphMap

function CelebrationModal({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  const { width } = useWindowDimensions()
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,8,15,0.78)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon count={160} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={480} fallSpeed={4200} />
          <ConfettiCannon count={90} origin={{ x: 0, y: 80 }} autoStart fadeOut explosionSpeed={420} fallSpeed={4000} />
          <ConfettiCannon count={90} origin={{ x: width, y: 80 }} autoStart fadeOut explosionSpeed={420} fallSpeed={4000} />
        </View>

        <Animated.View
          entering={ZoomIn.springify().damping(14).mass(0.7)}
          style={{ width: '100%', maxWidth: 360, backgroundColor: redesign.color.card, borderRadius: 30, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 24, alignItems: 'center', gap: 14, ...redesign.shadow.cta }}
        >
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '900', color: redesign.color.faint, letterSpacing: 2, textTransform: 'uppercase' }}>Level up</Text>

          <TierRing tier={tier} size={104} radius={34} borderWidth={5}>
            <MaterialCommunityIcons name={glyph(tier.emblem)} size={46} color={tier.color} />
          </TierRing>

          <View style={{ alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1 }}>LEVEL {tier.level}</Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 26, fontWeight: '900', color: redesign.color.ink, letterSpacing: -0.8, textAlign: 'center' }}>{tier.label}</Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '500', color: redesign.color.muted, textAlign: 'center', lineHeight: 20, marginTop: 2 }}>
              You leveled up by getting your work approved. Keep the streak going.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            style={{ alignSelf: 'stretch', minHeight: 52, borderRadius: 16, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}
          >
            <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 15.5, fontWeight: '800' }}>Let&apos;s go</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

// Mounted once inside the authed tabs tree. Watches the creator's real backend level
// and fires a one-time celebration the moment it increases (never on first load — the
// first real value just sets the baseline).
export function LevelUpHost() {
  const { data, isFetched } = useQuery({
    queryKey: ['creator-level'],
    queryFn: getCreatorLevel,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    placeholderData: (prev) => prev,
  })
  const level = data?.level ?? 1
  const [celebrateTier, setCelebrateTier] = useState<Tier | null>(null)
  // The last level we've reconciled against, held in a ref so comparison is
  // synchronous. The SecureStore baseline is read ONCE on mount; after that every
  // level change is compared against this ref with no async window. The old
  // busy-guard approach could drop a level change that landed while the async
  // read was in flight (early-return never re-queued once busy cleared), which
  // permanently swallowed a real level-up and could even leave the baseline unset.
  const baseline = useRef<number | null>(null)
  const [baselineLoaded, setBaselineLoaded] = useState(false)

  // Load the persisted baseline exactly once.
  useEffect(() => {
    let active = true
    getLastCelebratedLevel().then((last) => {
      if (!active) return
      baseline.current = last
      setBaselineLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  // Reconcile the live level against the baseline synchronously on every change.
  useEffect(() => {
    if (!baselineLoaded || !isFetched || !data) return
    const last = baseline.current
    if (last == null) {
      // First ever value — just set the baseline, never celebrate.
      baseline.current = level
      void setLastCelebratedLevel(level)
    } else if (level > last) {
      baseline.current = level
      void setLastCelebratedLevel(level)
      haptic.success()
      setCelebrateTier(TIERS[Math.min(TIERS.length, Math.max(1, level)) - 1])
    } else if (level !== last) {
      // Level went down (correction/rollback) — resync without celebrating.
      baseline.current = level
      void setLastCelebratedLevel(level)
    }
  }, [baselineLoaded, isFetched, level, data])

  // Share the single iOS modal slot with the other celebration hosts so a work-approval
  // (which bumps the level AND makes the video live) never presents two Modals at once.
  const active = useCelebrationSlot('levelup', celebrateTier != null)

  if (!celebrateTier || !active) return null
  return <CelebrationModal tier={celebrateTier} onClose={() => setCelebrateTier(null)} />
}
