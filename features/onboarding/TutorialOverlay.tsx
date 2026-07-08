import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { LiquidButton } from '@/features/shared/ui/LiquidButton'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import { HeartBurst } from '@/features/shared/ui/HeartBurst'
import Animated, { Easing, FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import { onReplayTutorial } from '@/features/onboarding/tutorialControl'
import { startProfileTour } from '@/features/onboarding/profileTourControl'
import { ProjectCardPreview } from '@/features/shared/ui/ProjectCardPreview'
import { router } from 'expo-router'

// SecureStore keys only allow [A-Za-z0-9._-] — the old ':' suffix made every
// call reject silently (the tutorial only ever fired via the live status
// transition, never via the seen-flag path).
const SEEN_PREFIX = 'tutorial_seen_approval_'

// ─── Mini mock-ups of the real app, each with an arrow pointing at the action ──

function Chip({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={{ color, fontFamily: typography.fontFamily, fontSize: 9, fontWeight: '800' }}>{children}</Text>
    </View>
  )
}

function MockDiscover({ arrow }: { arrow: object }) {
  return (
    <View style={{ width: 240, borderRadius: 26, padding: 4, backgroundColor: 'rgba(11,11,15,0.04)', borderWidth: 1, borderColor: redesign.color.hairlineStrong }}>
      {/* Double-bezel mini of the real FeaturedCampaign card */}
      <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: redesign.color.card, ...redesign.shadow.card }}>
        <View style={{ height: 82 }}>
          <LinearGradient colors={['rgba(99,80,184,0.45)', 'rgba(99,80,184,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }} />
          <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 7, paddingRight: 9, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <MaterialCommunityIcons name="star-four-points" size={9} color={redesign.color.purple} />
            <Text style={{ color: redesign.color.ink, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, fontFamily: typography.fontFamily }}>FEATURED</Text>
          </View>
        </View>
        <View style={{ padding: 12, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(99,80,184,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: redesign.color.purple, fontFamily: typography.fontFamily }}>C</Text>
            </View>
            <Text style={{ color: redesign.color.muted, fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily }}>ClearSkin</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, lineHeight: 19, fontFamily: typography.fontFamily }}>Glow Kit launch</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Chip bg="rgba(99,80,184,0.10)" color={redesign.color.purple}>Cash</Chip>
            <Chip bg={redesign.color.bg} color={redesign.color.muted}>3d left</Chip>
          </View>
          <View>
            <Animated.View style={[{ position: 'absolute', top: -34, alignSelf: 'center', zIndex: 2 }, arrow]}>
              <MaterialCommunityIcons name="arrow-down-bold" size={30} color={redesign.color.purple} />
            </Animated.View>
            <View style={{ height: 40, borderRadius: 14, paddingHorizontal: 14, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>View &amp; apply</Text>
              <View style={{ position: 'absolute', right: 5, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="arrow-top-right" size={14} color="#fff" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

function MockAccepted() {
  return (
    <View style={{ width: 220, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, padding: 18, alignItems: 'center', gap: 10, ...redesign.shadow.card }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: redesign.color.successBg, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="check-bold" size={28} color={redesign.color.successText} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>You&apos;re in</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center' }}>
        The brand accepted your application
      </Text>
    </View>
  )
}

function MockSubmit({ arrow }: { arrow: object }) {
  return (
    <View style={{ width: 268, borderRadius: 22, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 10, ...redesign.shadow.card }}>
      {/* Mirrors the real LinkSubmitRow: paste your TikTok link → ink pill submit */}
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingLeft: 14, paddingRight: 10, borderRadius: 14, borderWidth: 1, borderColor: '#0F9F6E', backgroundColor: redesign.color.bg }}>
        <Text numberOfLines={1} style={{ flex: 1, color: redesign.color.ink, fontSize: 13, fontFamily: typography.fontFamily }}>tiktok.com/@you/video/…</Text>
        <MaterialCommunityIcons name="check-circle" size={18} color="#0F9F6E" style={{ marginLeft: 6 }} />
      </View>
      <View>
        <Animated.View style={[{ position: 'absolute', top: -34, alignSelf: 'center', zIndex: 2 }, arrow]}>
          <MaterialCommunityIcons name="arrow-down-bold" size={30} color={redesign.color.purple} />
        </Animated.View>
        <View style={{ minHeight: 46, borderRadius: 999, backgroundColor: 'rgba(8,8,12,0.96)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="link-variant" size={17} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>Submit link</Text>
        </View>
      </View>
    </View>
  )
}

function MockWelcome() {
  return (
    <View style={{ width: 120, height: 120, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...redesign.shadow.cta }}>
      <LinearGradient colors={['#8B4DF7', '#5B27C4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      <MaterialCommunityIcons name="check-decagram" size={58} color="#fff" />
    </View>
  )
}

function MockLevels() {
  return (
    <View style={{ width: 290, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: 1, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, paddingVertical: 12, ...redesign.shadow.card }}>
      {/* Tier ring emblem — mirrors the real TierRow */}
      <View style={{ width: 36, height: 36, borderRadius: 13, borderWidth: 2, borderColor: redesign.color.purple, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="star-four-points" size={16} color={redesign.color.purple} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>Rising creator</Text>
          <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>200 to Pro</Text>
        </View>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: '62%', borderRadius: 999, backgroundColor: redesign.color.purple }} />
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
    </View>
  )
}

type Slide = { title: string; body: string; mock: (arrow: object) => React.ReactNode }

const SLIDES: Slide[] = [
  { title: 'You’re approved', body: 'Welcome to LikeLab. Here’s how it works in a few quick steps.', mock: () => <MockWelcome /> },
  { title: 'Discover & apply', body: 'Browse open campaigns and hold the Apply button on the ones that fit you.', mock: (a) => <MockDiscover arrow={a} /> },
  { title: 'Get selected', body: 'Brands review creators and pick their favourites — you’ll be notified when you’re in.', mock: () => <MockAccepted /> },
  { title: 'Film your video', body: 'Your campaigns live in Projects — each card tells you exactly what to do next. Some brands review your video first; your card always shows the next step.', mock: () => <ProjectCardPreview /> },
  { title: 'Post & go live', body: 'Post it on TikTok and drop the link in the app — that’s what takes it live.', mock: (a) => <MockSubmit arrow={a} /> },
  { title: 'Level up as a creator', body: 'Every time the brand approves your work you earn XP and climb the creator levels — your standing, right in the app.', mock: () => <MockLevels /> },
]

export function TutorialOverlay() {
  const { data: profile } = useCreatorProfile()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)

  const status = (profile?.reviewStatus || '').toLowerCase().trim()
  const userId = profile?.id
  const shownRef = useRef(false)
  const prevStatusRef = useRef<string | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openAtStart = () => {
    setIndex(0)
    // iOS can only present one Modal at a time. When approval fires, the
    // WelcomePendingOverlay Modal is dismissing in the same frame; presenting the
    // tutorial simultaneously gets dropped silently. Defer until that dismiss finishes.
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    openTimerRef.current = setTimeout(() => setVisible(true), 500)
  }

  useEffect(() => () => { if (openTimerRef.current) clearTimeout(openTimerRef.current) }, [])

  const bounce = useSharedValue(0)
  useEffect(() => {
    bounce.value = withRepeat(withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [bounce])
  const arrowDown = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value * 8 }] }))

  // Fire on the transition INTO approved. Uses an in-memory previous status (race-free for
  // live updates) + a per-user "seen" flag that is cleared whenever the account is observed
  // as NOT approved — so a removal followed by re-approval shows the tutorial again.
  useEffect(() => {
    if (!userId || !status) return
    const key = `${SEEN_PREFIX}${userId}`
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    const show = () => {
      if (shownRef.current) return
      shownRef.current = true
      openAtStart()
      // The seen flag is persisted in the Modal's onShow, NOT here: iOS presents only
      // one Modal at a time, so if What's New auto-opens on the same approval frame
      // this tutorial's Modal is dropped. Marking it seen before it presents would lose
      // the one-time onboarding forever; onShow fires only once it actually appears.
    }

    if (status === 'approved') {
      if (prev !== null && prev !== 'approved') {
        show() // live transition pending/rejected -> approved
      } else if (prev === null) {
        // first load while approved: show unless already seen for this approval
        SecureStore.getItemAsync(key).then((seen) => { if (!seen) show() }).catch(() => {})
      }
    } else {
      // observed as not approved -> reset so the next approval re-triggers
      shownRef.current = false
      SecureStore.deleteItemAsync(key).catch(() => {})
    }
  }, [userId, status])

  // Allow forcing the tutorial from elsewhere (e.g. Settings → Replay tutorial).
  useEffect(() => onReplayTutorial(() => {
    shownRef.current = true
    openAtStart()
  }), [])

  // On finish, fade out, jump to the profile tab and kick off the coachmark tour
  // that points at the real profile elements.
  const finish = () => {
    setVisible(false)
    router.navigate('/(tabs)/profile')
    startProfileTour()
  }

  const isLast = index === SLIDES.length - 1
  const slide = SLIDES[Math.min(index, SLIDES.length - 1)]
  const handleNext = () => {
    haptic.light()
    if (isLast) { haptic.success(); finish(); return }
    setIndex((i) => i + 1)
  }
  const handleBack = () => {
    haptic.selection()
    setIndex((i) => Math.max(0, i - 1))
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={finish}
      onShow={() => { if (userId) SecureStore.setItemAsync(`${SEEN_PREFIX}${userId}`, '1').catch(() => {}) }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: Math.max(20, insets.bottom) }}>
        <BlurView intensity={26} tint="dark" style={{ position: 'absolute', inset: 0 }} />

        {/* The floating story card — same language as the campaign brief walkthrough */}
        <Animated.View
          entering={ZoomIn.duration(240)}
          layout={LinearTransition.duration(240)}
          style={{ width: Math.min(width - 40, 400), borderRadius: 28, backgroundColor: redesign.color.card, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, gap: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              How it works
            </Text>
            {!isLast ? (
              <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip tutorial">
                <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 13.5, fontWeight: '700' }}>Skip</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Slide content — remounts per step so the cascade replays */}
          <Animated.View key={slide.title} style={{ alignItems: 'center', gap: 14 }}>
            <Animated.View entering={ZoomIn.duration(220).delay(60)} style={{ minHeight: 170, justifyContent: 'center' }}>
              {slide.mock(arrowDown)}
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(280).delay(140)}>
              <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 23, fontWeight: '800', letterSpacing: -0.7, lineHeight: 28, textAlign: 'center' }}>
                {slide.title}
              </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(300).delay(200)}>
              <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '500', lineHeight: 21, textAlign: 'center', maxWidth: 310 }}>
                {slide.body}
              </Text>
            </Animated.View>
          </Animated.View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              {SLIDES.map((_, i) => (
                <Animated.View
                  key={i}
                  layout={LinearTransition.duration(200)}
                  style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 999, backgroundColor: i === index ? redesign.color.ink : redesign.color.hairlineStrong }}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {index > 0 ? (
                <Pressable onPress={handleBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700', color: redesign.color.muted }}>Back</Text>
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}>
                <LiquidButton label={isLast ? 'View profile' : 'Next'} onPress={handleNext} minHeight={50} hapticFeedback={false} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Celebration confetti on the welcome step — above everything */}
        {visible && index === 0 ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <HeartBurst count={24} />
          </View>
        ) : null}
      </View>
    </Modal>
  )
}
