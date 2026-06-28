import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import type { Tier, TierProgress } from '@/features/profile/tiers'
import type { Reputation, ReputationSignal } from '@/features/profile/reputation'

const glyph = (name: string) => name as keyof typeof MaterialCommunityIcons.glyphMap

// Solid pill badge ("Professional creator") — placed next to the creator's name.
export function TierBadge({ tier, compact }: { tier: Tier; compact?: boolean }) {
  return (
    <View style={{ borderRadius: 999, overflow: 'hidden' }}>
      <LinearGradient
        colors={tier.ring}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: compact ? 9 : 11, paddingVertical: compact ? 4 : 5 }}
      >
        <MaterialCommunityIcons name={glyph(tier.emblem)} size={compact ? 11 : 13} color="#fff" />
        <Text style={{ fontFamily: typography.fontFamily, fontSize: compact ? 10.5 : 12, fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}>
          {compact ? tier.short : tier.label}
        </Text>
      </LinearGradient>
    </View>
  )
}

// Tier-coloured avatar ring wrapper — drop-in replacement for a plain gradient
// ring. Renders children inside a gradient border in the current tier's colours.
export function TierRing({ tier, size, radius, borderWidth = 3, children }: { tier: Tier; size: number; radius: number; borderWidth?: number; children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={tier.ring}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center', ...redesign.shadow.card }}
    >
      <View style={{ width: size - borderWidth * 2, height: size - borderWidth * 2, borderRadius: radius - borderWidth, overflow: 'hidden', backgroundColor: redesign.color.bg, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </LinearGradient>
  )
}

// Small floating emblem chip — the medal/level marker overlaid on the avatar.
export function TierEmblem({ tier, size = 30 }: { tier: Tier; size?: number }) {
  return (
    <LinearGradient
      colors={tier.ring}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: redesign.color.bg, ...redesign.shadow.card }}
    >
      <MaterialCommunityIcons name={glyph(tier.emblem)} size={size * 0.5} color="#fff" />
    </LinearGradient>
  )
}

// Slim, tappable tier strip for the profile — subtle one-liner with a mini
// progress bar that opens the full "Creator levels" screen.
export function TierRow({ progress, onPress }: { progress: TierProgress; onPress: () => void }) {
  const fill = useSharedValue(0)
  useEffect(() => {
    fill.value = 0
    fill.value = withDelay(220, withTiming(progress.fraction, { duration: 800, easing: Easing.out(Easing.cubic) }))
  }, [progress.fraction, fill])

  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(3, fill.value * 100)}%` }))
  const { tier, next, remaining } = progress
  const atTop = next == null

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tier.label}. ${atTop ? 'Top level' : `${remaining} deliverables to ${next!.short}`}. View all levels`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: 0.5, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, paddingVertical: 12, ...redesign.shadow.card }}
    >
      <TierRing tier={tier} size={36} radius={13} borderWidth={2}>
        <MaterialCommunityIcons name={glyph(tier.emblem)} size={16} color={tier.color} />
      </TierRing>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>
            {tier.label}
          </Text>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '600', color: redesign.color.muted }}>
            {atTop ? 'Max level' : `${remaining} to ${next!.short}`}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, barStyle]}>
            <LinearGradient colors={tier.ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
          </Animated.View>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
    </Pressable>
  )
}

// A single reputation signal row — an animated meter for live signals, or a
// locked "coming soon" row for signals the backend doesn't feed yet. The locked
// state is honest: it shows the creator what WILL count, without faking a number.
function SignalRow({ signal, tint, index }: { signal: ReputationSignal; tint: string; index: number }) {
  const fill = useSharedValue(0)
  const target = signal.value ?? 0
  useEffect(() => {
    fill.value = 0
    fill.value = withDelay(260 + index * 70, withTiming(target, { duration: 760, easing: Easing.out(Easing.cubic) }))
  }, [target, index, fill])

  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(signal.tracked ? 3 : 0, fill.value * 100)}%` }))

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: signal.tracked ? 1 : 0.55 }}>
      <Text style={{ width: 78, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '600', color: redesign.color.muted }}>
        {signal.label}
      </Text>
      <View style={{ flex: 1, height: 7, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        {signal.tracked ? (
          <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: tint }, barStyle]} />
        ) : null}
      </View>
      <View style={{ width: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
        {signal.tracked ? null : <MaterialCommunityIcons name="lock-outline" size={11} color={redesign.color.faint} />}
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '700', color: signal.tracked ? redesign.color.ink : redesign.color.faint }}>
          {signal.display}
        </Text>
      </View>
    </View>
  )
}

// Reputation breakdown — the creator's standing as a score + the signals that
// build it. Live signals fill; future ones (on-time, quality, reach) show as
// locked "Soon" rows so the creator sees what's coming. One source of truth lives
// in features/profile/reputation.ts; brands/admins will read the same score later.
export function ReputationCard({ reputation, tint }: { reputation: Reputation; tint: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(90)}
      style={{ backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: 0.5, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 14, ...redesign.shadow.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 1 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 0.8 }}>
            REPUTATION
          </Text>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '500', color: redesign.color.muted }}>
            Built by completing great work
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 30, fontWeight: '800', color: tint, letterSpacing: -1 }}>
            {reputation.score}
          </Text>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 13, fontWeight: '700', color: redesign.color.faint }}>
            /100
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {reputation.signals.map((signal, index) => (
          <SignalRow key={signal.id} signal={signal} tint={tint} index={index} />
        ))}
      </View>
    </Animated.View>
  )
}

// Progress meter — "2 campaigns to Pro" with an animated gradient fill, the
// level marker, and the unlock perk for the NEXT tier as motivation. Shows a
// celebratory state once the top of the ladder is reached.
export function TierProgressCard({ progress }: { progress: TierProgress }) {
  const fill = useSharedValue(0)
  useEffect(() => {
    fill.value = 0
    fill.value = withDelay(220, withTiming(progress.fraction, { duration: 900, easing: Easing.out(Easing.cubic) }))
  }, [progress.fraction, fill])

  const barStyle = useAnimatedStyle(() => ({ width: `${Math.max(3, fill.value * 100)}%` }))
  const { tier, next, remaining } = progress
  const atTop = next == null

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(60)}
      style={{ backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: 0.5, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 12, ...redesign.shadow.card }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TierRing tier={tier} size={44} radius={15} borderWidth={2.5}>
          <MaterialCommunityIcons name={glyph(tier.emblem)} size={20} color={tier.color} />
        </TierRing>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.2 }}>
              {tier.label}
            </Text>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 10.5, fontWeight: '700', color: redesign.color.faint }}>
              LVL {tier.level}
            </Text>
          </View>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted, marginTop: 1 }}>
            {atTop
              ? 'Top of the ladder — you’re a Legend 💎'
              : `${remaining} deliverable${remaining === 1 ? '' : 's'} to ${next!.short}`}
          </Text>
        </View>
        {atTop ? null : <TierBadge tier={next!} compact />}
      </View>

      <View style={{ height: 9, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, barStyle]}>
          <LinearGradient colors={tier.ring} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </Animated.View>
  )
}
