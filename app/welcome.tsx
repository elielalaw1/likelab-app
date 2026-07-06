import { useEffect, useRef, useState } from 'react'
import { Image, ImageBackground, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { designBackground, designWordmark } from '@/design/assets'

// Value-first welcome carousel — shown when a creator taps "Sign up", before the
// account form. Three animated mini mock-ups of the real app: a live feed of
// campaigns with a pulsing Apply CTA, a LIVE leaderboard where "You" (the user)
// climbs from the bottom past everyone to #1, and a reward showcase of what we
// actually deliver. Card shimmer + confetti on the final payoff slide.

type Drivers = { float: SharedValue<number>; pulse: SharedValue<number>; bounce: SharedValue<number> }

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

// ─── Small primitives ─────────────────────────────────────────────────────────
function Chip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 }}>{children}</Text>
    </View>
  )
}

// Diagonal light sheen that sweeps across a card on a loop. Needs overflow:'hidden'.
function Shimmer() {
  const x = useSharedValue(0)
  useEffect(() => {
    x.value = withRepeat(withDelay(900, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1, false)
  }, [x])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [0, 1], [-90, 340]) }, { rotateZ: '16deg' }],
    opacity: interpolate(x.value, [0, 0.12, 0.88, 1], [0, 0.85, 0.85, 0]),
  }))
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -40, bottom: -40, width: 48 }, style]}>
      <LinearGradient colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
    </Animated.View>
  )
}

// Continuously climbing number that resets — drives the "views are growing" feel.
function useLiveCount(base: number, span: number) {
  const [n, setN] = useState(base)
  useEffect(() => {
    const id = setInterval(() => {
      setN((prev) => {
        const next = prev + Math.max(1, Math.ceil(span / 22))
        return next > base + span ? base : next
      })
    }, 110)
    return () => clearInterval(id)
  }, [base, span])
  return n
}

// Index that cycles 0..count-1 on an interval — for "live feed" swaps + highlights.
function useCycle(count: number, ms: number) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % count), ms)
    return () => clearInterval(id)
  }, [count, ms])
  return i
}

// ─── Slide 1 · Discover & apply (live campaign feed) ──────────────────────────
const CAMPAIGNS = [
  { brand: 'Aurora Beauty', title: 'Summer Glow drop', reward: 'REWARD · CASH', days: '27d left' },
  { brand: 'Nordic Active', title: 'Move challenge', reward: 'REWARD · PRODUCT', days: '12d left' },
  { brand: 'Lumière', title: 'Skincare ritual', reward: 'REWARD · EXPERIENCE', days: '5d left' },
]

function DiscoverMock({ float, pulse, bounce }: Drivers) {
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-8, 8]) }] }))
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }] }))
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, 7]) }] }))
  const c = useCycle(CAMPAIGNS.length, 2200)
  const camp = CAMPAIGNS[c]
  const applied = useLiveCount(142, 80)
  return (
    <Animated.View style={[{ width: 236, borderRadius: 24, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, overflow: 'hidden', ...redesign.shadow.card }, cardStyle]}>
      <View style={{ height: 80, padding: 10, justifyContent: 'space-between' }}>
        <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0, opacity: 0.5 }} />
        <Animated.View key={`b${c}`} entering={FadeIn.duration(360)} style={{ backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="check-decagram" size={11} color={redesign.color.purple} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>{camp.brand}</Text>
        </Animated.View>
        <View style={{ backgroundColor: 'rgba(11,11,15,0.55)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#fff', fontFamily: typography.fontFamily }}>{applied} applied</Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        <Animated.View key={`t${c}`} entering={FadeIn.duration(360)} style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>{camp.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip bg="rgba(99,80,184,0.10)" color={redesign.color.purple}>{camp.reward}</Chip>
            <Chip bg={redesign.color.bg} color={redesign.color.muted}>{camp.days}</Chip>
          </View>
        </Animated.View>
        <View style={{ marginTop: 2 }}>
          <Animated.View style={[{ position: 'absolute', top: -34, alignSelf: 'center', zIndex: 2 }, arrowStyle]}>
            <MaterialCommunityIcons name="gesture-tap" size={26} color={redesign.color.purple} />
          </Animated.View>
          <Animated.View style={[{ height: 42, borderRadius: 999, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, ctaStyle]}>
            <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '800', fontFamily: typography.fontFamily }}>Apply now</Text>
            <MaterialCommunityIcons name="arrow-right" size={15} color="#fff" />
          </Animated.View>
        </View>
      </View>
      <Shimmer />
    </Animated.View>
  )
}

// ─── Slide 2 · You climb 50 places to #1 ──────────────────────────────────────
// "You" starts at #50, dead last. A camera follows you up the 50-deep board as
// you overtake name after name (they whoosh past). Near the top you lift OVER
// the leaders, take the crown, and the top names bump down a step — their medals
// (shown in a column BESIDE each name) hand off to the new owners.
const ROW_H = 34
const VISIBLE = 7
const TOTAL = 50
const CENTER = 3 // the screen row You rests on while the board scrolls past
const BODY_H = VISIBLE * ROW_H
const MAX_SCROLL = (TOTAL - VISIBLE) * ROW_H
const YOU_FROM = (TOTAL - 1) * ROW_H

type Row = { name: string; color: string; slot: number }
const NAMED: Row[] = [
  { name: 'Eli', color: redesign.color.cyan, slot: 0 },
  { name: 'Leo', color: redesign.color.magenta, slot: 1 },
  { name: 'Markus', color: redesign.color.yellow, slot: 2 },
  { name: 'Khader', color: '#5B8DEF', slot: 3 },
  { name: 'Theo', color: redesign.color.payoutGreen, slot: 4 },
  { name: 'Hugo', color: '#F2994A', slot: 5 },
]
const FILLER_NAMES = ['Noah', 'Liam', 'Vera', 'Saga', 'Iris', 'Nora', 'Alva', 'Sven', 'Wilma', 'Otto', 'Ines', 'Tuva', 'Ebba', 'Axel', 'Folke', 'Greta', 'Nils', 'Maja', 'Stina', 'Edith', 'Bo', 'Frans', 'Alma', 'Loke']
const REEL_COLORS = ['#5B8DEF', '#F2994A', '#9B5DE5', redesign.color.cyan, redesign.color.magenta, redesign.color.yellow, redesign.color.payoutGreen]
// Fillers occupy every slot between the named leaders and You (#50).
const FILLERS: Row[] = Array.from({ length: TOTAL - 1 - NAMED.length }, (_, i) => ({
  name: FILLER_NAMES[i % FILLER_NAMES.length],
  color: REEL_COLORS[i % REEL_COLORS.length],
  slot: NAMED.length + i,
}))

// Rank marker shown beside a name: crown / silver / bronze / plain number.
function RankBadge({ slot }: { slot: number }) {
  if (slot === 0) return <MaterialCommunityIcons name="crown" size={15} color={redesign.color.gold} />
  if (slot === 1) return <Text style={{ fontSize: 13 }}>🥈</Text>
  if (slot === 2) return <Text style={{ fontSize: 13 }}>🥉</Text>
  return <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '800', fontFamily: typography.fontFamily }}>{slot + 1}</Text>
}

// Shared row pill: [rank cell][avatar][name][right].
function RowShell({ color, label, you, children, right }: { color: string; label: string; you?: boolean; children: React.ReactNode; right: React.ReactNode }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 8, borderWidth: you ? 1 : 0, borderColor: 'rgba(99,80,184,0.9)', backgroundColor: you ? 'rgba(99,80,184,0.3)' : 'rgba(255,255,255,0.05)' }}>
      <View style={{ width: 22, height: ROW_H - 5, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {you ? <MaterialCommunityIcons name="account" size={14} color="#fff" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: typography.fontFamily }}>{label[0]}</Text>}
      </View>
      <Text style={{ flex: 1, color: '#fff', fontSize: 12.5, fontWeight: '800', fontFamily: typography.fontFamily }} numberOfLines={1}>{label}</Text>
      {right}
    </View>
  )
}

const PositionedRow = ({ slot, children }: { slot: number; children: React.ReactNode }) => (
  <View style={{ position: 'absolute', top: slot * ROW_H, left: 0, right: 0, height: ROW_H - 5 }}>{children}</View>
)

const Bar = () => <View style={{ height: 6, width: 34, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' }} />

// A leader near the top whose medal hands down one rank when You takes #1.
function NamedRow({ item, climb }: { item: Row; climb: SharedValue<number> }) {
  const fromStyle = useAnimatedStyle(() => ({ opacity: interpolate(climb.value, [0.8, 0.9], [1, 0], Extrapolation.CLAMP) }))
  const toStyle = useAnimatedStyle(() => ({ opacity: interpolate(climb.value, [0.84, 0.94], [0, 1], Extrapolation.CLAMP) }))
  return (
    <PositionedRow slot={item.slot}>
      <RowShell color={item.color} label={item.name} right={<Bar />}>
        <Animated.View style={[{ position: 'absolute' }, fromStyle]}><RankBadge slot={item.slot} /></Animated.View>
        <Animated.View style={[{ position: 'absolute' }, toStyle]}><RankBadge slot={item.slot + 1} /></Animated.View>
      </RowShell>
    </PositionedRow>
  )
}

function LeaderboardMock({ float, bounce }: Drivers) {
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-7, 7]) }] }))
  // climb: 0 (You at #50) → 1 (You at #1). Long ease-out rise, hold, reset, loop.
  const climb = useSharedValue(0)
  useEffect(() => {
    climb.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 700 }),
        withTiming(1, { duration: 3400, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1700 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    )
  }, [climb])

  // Camera follows You: keeps You on the CENTER screen row, clamped at top/bottom.
  const cameraStyle = useAnimatedStyle(() => {
    const youY = interpolate(climb.value, [0, 0.88, 1], [YOU_FROM, 0, 0], Extrapolation.CLAMP)
    const scroll = Math.min(Math.max(youY - CENTER * ROW_H, 0), MAX_SCROLL)
    return { transform: [{ translateY: -scroll }] }
  })
  // The whole board bumps down one row as You lands on #1.
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(climb.value, [0.8, 0.93], [0, ROW_H], Extrapolation.CLAMP) }] }))
  const youStyle = useAnimatedStyle(() => {
    const youY = interpolate(climb.value, [0, 0.88, 1], [YOU_FROM, 0, 0], Extrapolation.CLAMP)
    return {
      zIndex: 10,
      transform: [
        { translateY: youY + interpolate(float.value, [0, 1], [-2, 2]) },
        { scale: interpolate(climb.value, [0, 0.12, 0.85, 1], [1, 1.05, 1.05, 1], Extrapolation.CLAMP) },
      ],
    }
  })
  const chevronStyle = useAnimatedStyle(() => ({ opacity: interpolate(climb.value, [0.8, 0.9], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: interpolate(bounce.value, [0, 1], [2, -4]) }] }))
  const crownStyle = useAnimatedStyle(() => ({ opacity: interpolate(climb.value, [0.86, 1], [0, 1], Extrapolation.CLAMP) }))

  return (
    <Animated.View style={[{ width: 258, borderRadius: 24, backgroundColor: redesign.color.darkScreen, padding: 14, overflow: 'hidden', ...redesign.shadow.cta }, cardStyle]}>
      <LinearGradient pointerEvents="none" colors={['rgba(99,80,184,0.45)', 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.85 }} style={{ position: 'absolute', top: -24, right: -24, width: 150, height: 150, borderRadius: 75 }} />
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2, fontFamily: typography.fontFamily, marginBottom: 8 }}>● LIVE LEADERBOARD · 50</Text>

      <View style={{ height: BODY_H, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: TOTAL * ROW_H }, cameraStyle]}>
          {/* Background board (bumps down one row at the climax) */}
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: TOTAL * ROW_H }, bumpStyle]}>
            {FILLERS.map((f) => (
              <PositionedRow key={`f${f.slot}`} slot={f.slot}>
                <RowShell color={f.color} label={f.name} right={<Bar />}>
                  <RankBadge slot={f.slot} />
                </RowShell>
              </PositionedRow>
            ))}
            {NAMED.map((n) => (
              <NamedRow key={n.name} item={n} climb={climb} />
            ))}
          </Animated.View>

          {/* You — lifts over everyone */}
          <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: ROW_H - 5 }, youStyle]}>
            <RowShell color={redesign.color.purple} label="You" you right={<SpinViews climb={climb} />}>
              <Animated.View style={[{ position: 'absolute' }, chevronStyle]}>
                <MaterialCommunityIcons name="chevron-up" size={18} color={redesign.color.payoutGreen} />
              </Animated.View>
              <Animated.View style={[{ position: 'absolute' }, crownStyle]}>
                <MaterialCommunityIcons name="crown" size={15} color={redesign.color.gold} />
              </Animated.View>
            </RowShell>
          </Animated.View>
        </Animated.View>
      </View>
      <Shimmer />
    </Animated.View>
  )
}

// Views that spin UP the higher You climbs — driven by the same shared value via
// useAnimatedProps, so it stays on the UI thread (no per-frame React re-render).
function SpinViews({ climb }: { climb: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => {
    const v = Math.round(interpolate(climb.value, [0, 1], [1200, 248000], Extrapolation.CLAMP))
    const text = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
    return { text, defaultValue: text } as Partial<{ text: string; defaultValue: string }>
  })
  return (
    <AnimatedTextInput
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={animatedProps as never}
      style={{ minWidth: 46, textAlign: 'right', padding: 0, color: redesign.color.payoutGreen, fontSize: 11.5, fontWeight: '800', fontFamily: typography.fontFamily }}
    />
  )
}

// ─── Slide 3 · Win real rewards (the stuff we deliver) ────────────────────────
const REWARDS: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; sub: string; tint: string }[] = [
  { icon: 'cash-multiple', label: 'Cash', sub: 'Get paid in kr', tint: redesign.color.payoutGreen },
  { icon: 'airplane', label: 'Experiences', sub: 'Events & trips', tint: redesign.color.cyan },
  { icon: 'tshirt-crew', label: 'Clothing', sub: 'Free wardrobe', tint: redesign.color.magenta },
  { icon: 'gift-outline', label: 'Products', sub: 'PR packages', tint: redesign.color.purple },
]

function RewardsMock({ float }: Drivers) {
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-7, 7]) }] }))
  const active = useCycle(REWARDS.length, 750)
  return (
    <Animated.View style={[{ width: 252, gap: 10 }, cardStyle]}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {REWARDS.map((r, i) => {
          const on = i === active
          return (
            <Animated.View
              key={r.label}
              entering={FadeInDown.delay(i * 90).duration(420)}
              style={{
                width: 116, borderRadius: 20, padding: 14, gap: 8, overflow: 'hidden',
                backgroundColor: redesign.color.card, borderWidth: 1,
                borderColor: on ? r.tint : redesign.color.hairlineStrong,
                transform: [{ scale: on ? 1.04 : 1 }],
                ...redesign.shadow.card,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? r.tint : redesign.color.bg }}>
                <MaterialCommunityIcons name={r.icon} size={22} color={on ? '#fff' : r.tint} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>{r.label}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>{r.sub}</Text>
              {on ? <Shimmer /> : null}
            </Animated.View>
          )
        })}
      </View>
    </Animated.View>
  )
}

// ─── Slide · Create & get approved (video + brand greenlight) ─────────────────
function ContentMock({ float, pulse }: Drivers) {
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-8, 8]) }] }))
  const playStyle = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.12]) }] }))
  // "Approved" badge pops in, holds, resets — on a loop.
  const pop = useSharedValue(0)
  useEffect(() => {
    pop.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 480, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 1500 }),
      ),
      -1,
      false,
    )
  }, [pop])
  const badgeStyle = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: interpolate(pop.value, [0, 1], [0.4, 1]) }] }))
  return (
    <Animated.View style={[{ width: 180, borderRadius: 24, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, overflow: 'hidden', ...redesign.shadow.card }, cardStyle]}>
      <View style={{ height: 210, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={redesign.gradient.holographic} locations={redesign.gradient.holographicLocations} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
        <Animated.View style={[{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }, playStyle]}>
          <MaterialCommunityIcons name="play" size={28} color={redesign.color.ink} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, badgeStyle]}>
          <MaterialCommunityIcons name="check-decagram" size={12} color={redesign.color.successText} />
          <Text style={{ color: redesign.color.successText, fontSize: 9, fontWeight: '800', fontFamily: typography.fontFamily }}>APPROVED</Text>
        </Animated.View>
      </View>
      <View style={{ padding: 12, gap: 5 }}>
        <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1, fontFamily: typography.fontFamily }}>YOUR VIDEO</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow routine 🎬</Text>
      </View>
      <Shimmer />
    </Animated.View>
  )
}

type Slide = {
  title: string
  subtitle: string
  render: (d: Drivers) => React.ReactNode
}

const SLIDES: Slide[] = [
  {
    title: 'Collab with brands\nyou love',
    subtitle: 'Discover campaigns that match your style and apply in seconds.',
    render: (d) => <DiscoverMock {...d} />,
  },
  {
    title: 'Create &\nget approved',
    subtitle: 'Film your video in the app — brands review and greenlight it.',
    render: (d) => <ContentMock {...d} />,
  },
  {
    title: 'Climb to #1\non the leaderboard',
    subtitle: 'Your views rise live — overtake the other creators and reach the top.',
    render: (d) => <LeaderboardMock {...d} />,
  },
  {
    title: 'Win real\nrewards',
    subtitle: 'Cash, experiences, clothing and products — the perks we actually deliver.',
    render: (d) => <RewardsMock {...d} />,
  },
]

export default function WelcomePage() {
  const { width } = useWindowDimensions()
  const scrollX = useSharedValue(0)
  const scrollRef = useRef<Animated.ScrollView>(null)
  const [index, setIndex] = useState(0)

  const float = useSharedValue(0)
  const pulse = useSharedValue(0)
  const bounce = useSharedValue(0)
  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true)
    pulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true)
    bounce.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [float, pulse, bounce])
  const drivers: Drivers = { float, pulse, bounce }

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x
  })

  const isLast = index === SLIDES.length - 1

  const goNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (isLast) {
      router.replace('/signup')
      return
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true })
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      {/* Signature backdrop image (shared with login) + soft veil */}
      <ImageBackground source={designBackground} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} resizeMode="cover" />
      <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />

      {/* Celebration when the creator reaches the final payoff slide */}
      {isLast ? (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <ConfettiCannon count={130} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={430} fallSpeed={3000} />
        </View>
      ) : null}

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Header: wordmark + skip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, height: 44 }}>
          <Image source={designWordmark} style={{ width: 132, height: 24 }} resizeMode="contain" />
          <Pressable onPress={() => router.replace('/signup')} hitSlop={10}>
            <Text style={{ color: redesign.color.muted, fontSize: 14, fontWeight: '700', fontFamily: typography.fontFamily }}>Skip</Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide, i) => (
            <SlideView key={i} slide={slide} index={i} scrollX={scrollX} width={width} drivers={drivers} />
          ))}
        </Animated.ScrollView>

        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8, gap: 14 }}>
          <LiquidButton label={isLast ? 'Create your account' : 'Continue'} onPress={goNext} minHeight={54} />
          <Pressable onPress={() => router.replace('/login')} hitSlop={8} style={{ alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
            <Text style={{ color: redesign.color.muted, fontSize: 14.5, fontFamily: typography.fontFamily }}>Already have an account?</Text>
            <Text style={{ color: redesign.color.ink, fontSize: 14.5, fontWeight: '800', fontFamily: typography.fontFamily }}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

function SlideView({ slide, index, scrollX, width, drivers }: { slide: Slide; index: number; scrollX: SharedValue<number>; width: number; drivers: Drivers }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

  const mockStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(scrollX.value, inputRange, [width * 0.26, 0, -width * 0.26], Extrapolation.CLAMP) },
      { scale: interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], Extrapolation.CLAMP) },
    ],
  }))

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(scrollX.value, inputRange, [width * 0.14, 0, -width * 0.14], Extrapolation.CLAMP) }],
  }))

  return (
    <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Animated.View entering={FadeIn.duration(420)} style={[{ marginBottom: 44, alignItems: 'center', justifyContent: 'center' }, mockStyle]}>
        {slide.render(drivers)}
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center' }, textStyle]}>
        <Text style={{ textAlign: 'center', color: redesign.color.ink, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -1, fontFamily: typography.fontFamily, marginBottom: 14 }}>
          {slide.title}
        </Text>
        <Text style={{ textAlign: 'center', color: redesign.color.muted, fontSize: 15.5, lineHeight: 23, fontWeight: '500', fontFamily: typography.fontFamily, maxWidth: 320 }}>
          {slide.subtitle}
        </Text>
      </Animated.View>
    </View>
  )
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width]
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 26, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
  }))
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: redesign.color.ink }, style]} />
}
