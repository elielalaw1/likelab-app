import { useEffect, useRef, useState } from 'react'
import { Image, ImageBackground, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { Redirect, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthSession } from '@/features/shared/hooks/useAuthSession'
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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { ElectricBorder } from '@/features/shared/ui/ElectricBorder'
import { designBackground, designWordmark } from '@/design/assets'

// Value-first welcome carousel — shown when a creator taps "Sign up", before the
// account form. Animated mini mock-ups of the real app: a live feed of campaigns
// with a pulsing Apply CTA, the create-and-get-approved flow, and a reward
// showcase of what we actually deliver. Card shimmer + confetti on the final
// payoff slide.

type Drivers = { float: SharedValue<number>; pulse: SharedValue<number>; bounce: SharedValue<number> }

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

function DiscoverMock({ float, bounce }: Drivers) {
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.value, [0, 1], [-8, 8]) }] }))
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, 7]) }] }))
  const c = useCycle(CAMPAIGNS.length, 2200)
  const camp = CAMPAIGNS[c]
  const applied = useLiveCount(142, 80)
  // The app's signature interaction, demoed on loop: the hold-to-apply button
  // charging from empty to full, then resetting.
  const charge = useSharedValue(0)
  useEffect(() => {
    charge.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 700 }),
        withTiming(1, { duration: 1600, easing: Easing.linear }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      false
    )
  }, [charge])
  const chargeStyle = useAnimatedStyle(() => ({ width: `${charge.value * 100}%` }))
  return (
    <Animated.View style={[{ width: 236 }, cardStyle]}>
      {/* Partner-campaign electric frame — the same live border as in the app */}
      <ElectricBorder radius={24} color="#7C5CFF">
        <View style={{ borderRadius: 24, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
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
                <MaterialCommunityIcons name="gesture-tap-hold" size={26} color={redesign.color.purple} />
              </Animated.View>
              {/* Hold-to-apply, charging on loop */}
              <View style={{ height: 42, borderRadius: 999, backgroundColor: 'rgba(8,8,12,0.96)', overflow: 'hidden', justifyContent: 'center' }}>
                <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#26262E' }, chargeStyle]}>
                  <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.85)' }} />
                </Animated.View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="gesture-tap-hold" size={15} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: typography.fontFamily }}>Hold to apply</Text>
                </View>
              </View>
            </View>
          </View>
          <Shimmer />
        </View>
      </ElectricBorder>
    </Animated.View>
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
    subtitle: 'Discover campaigns that match your style — hold to apply in seconds.',
    render: (d) => <DiscoverMock {...d} />,
  },
  {
    title: 'Create &\nget approved',
    subtitle: 'Film your video in the app — brands review and greenlight it.',
    render: (d) => <ContentMock {...d} />,
  },
  {
    title: 'Win real\nrewards',
    subtitle: 'Cash, experiences, clothing and products — the perks we actually deliver.',
    render: (d) => <RewardsMock {...d} />,
  },
]

export default function WelcomePage() {
  const { session } = useAuthSession()
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
    // LiquidButton fires the press haptic itself.
    if (isLast) {
      router.replace('/signup')
      return
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true })
  }

  // A session can resolve AFTER index.tsx already routed here (slow cold start /
  // token refresh that exceeded the auth failsafe). Bounce a signed-in creator into
  // the app instead of stranding them on the welcome carousel.
  if (session) return <Redirect href="/(tabs)/overview" />

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
