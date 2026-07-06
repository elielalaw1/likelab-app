import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Screen } from '@/features/shared/ui/Screen'
import { AppHeader } from '@/features/shared/ui/AppHeader'
import { redesign, typography } from '@/features/core/theme'
import { useReputation } from '@/features/profile/hooks'
import { getTierLadder, XP_THRESHOLDS, type TierLadderEntry } from '@/features/profile/tiers'
import { TierProgressCard, TierRing } from '@/features/profile/ui/TierBadge'

const glyph = (name: string) => name as keyof typeof MaterialCommunityIcons.glyphMap

function LadderRow({ entry, index }: { entry: TierLadderEntry; index: number }) {
  const { tier, achieved, current } = entry
  const locked = !achieved
  const requirement =
    tier.level === 1
      ? 'Starting level — everyone begins here'
      : `Reach ${XP_THRESHOLDS[tier.level - 1].toLocaleString()} XP`

  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(40 + index * 28)}
      style={{
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
        backgroundColor: current ? 'rgba(99,80,184,0.05)' : redesign.color.card,
        borderRadius: 18,
        borderWidth: current ? 1 : 0.5,
        borderColor: current ? tier.color : redesign.color.hairlineStrong,
        padding: 14,
        ...redesign.shadow.card,
      }}
    >
      <View style={{ opacity: locked ? 0.4 : 1 }}>
        <TierRing tier={tier} size={48} radius={16} borderWidth={2.5}>
          <MaterialCommunityIcons name={glyph(tier.emblem)} size={22} color={tier.color} />
        </TierRing>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', color: redesign.color.faint, letterSpacing: 0.8 }}>
            LVL {tier.level}
          </Text>
          {current ? (
            <View style={{ borderRadius: 999, backgroundColor: 'rgba(99,80,184,0.12)', paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', color: redesign.color.purple, letterSpacing: 0.4 }}>YOU’RE HERE</Text>
            </View>
          ) : achieved ? (
            <MaterialCommunityIcons name="check-circle" size={14} color={redesign.color.successText} />
          ) : (
            <MaterialCommunityIcons name="lock-outline" size={13} color={redesign.color.faint} />
          )}
        </View>

        <Text style={{ fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.3 }}>
          {tier.label}
        </Text>
        <Text style={{ fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: '500', color: redesign.color.muted }}>
          {requirement}
        </Text>
      </View>
    </Animated.View>
  )
}

export default function TiersPage() {
  const { tier: progress } = useReputation()
  const ladder = useMemo(() => getTierLadder(progress.level), [progress.level])

  return (
    <Screen tabAware={false} bgColor={redesign.color.bg}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(250)}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={18} color={redesign.color.muted} />
          <Text style={{ color: redesign.color.muted, fontWeight: '500', fontSize: 13, fontFamily: typography.fontFamily }}>Back</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(250).delay(60)}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -1, lineHeight: 38 }}>
          Creator levels
        </Text>
        <Text style={{ fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, lineHeight: 21, marginTop: 4 }}>
          Earn XP from approved work to climb the ladder.
        </Text>
      </Animated.View>

      <TierProgressCard progress={progress} />

      <Text style={{ fontSize: 11, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1.0, textTransform: 'uppercase', fontFamily: typography.fontFamily, marginTop: 2 }}>
        All levels
      </Text>

      <View style={{ gap: 10 }}>
        {ladder.map((entry, index) => (
          <LadderRow key={entry.tier.id} entry={entry} index={index} />
        ))}
      </View>

      <Text style={{ fontSize: 12, fontWeight: '500', color: redesign.color.faint, fontFamily: typography.fontFamily, lineHeight: 18, textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
        Levels are a fun way to track your journey as a creator.
      </Text>
    </Screen>
  )
}
