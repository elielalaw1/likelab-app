import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as SecureStore from 'expo-secure-store'
import ConfettiCannon from 'react-native-confetti-cannon'
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import { onReplayTutorial } from '@/features/onboarding/tutorialControl'
import { startProfileTour } from '@/features/onboarding/profileTourControl'
import { VideoGridPreview } from '@/features/shared/ui/VideoGridPreview'
import { router } from 'expo-router'

const SEEN_PREFIX = 'tutorial_seen_approval:'

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
    <View style={{ width: 220, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, overflow: 'hidden', ...redesign.shadow.card }}>
      <View style={{ height: 72, justifyContent: 'flex-start', padding: 8 }}>
        <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0, opacity: 0.45 }} />
        <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>◍ ClearSkin</Text>
        </View>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow Kit launch</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip bg="rgba(124,63,242,0.10)" color={redesign.color.purple}>REWARD · CASH</Chip>
          <Chip bg={redesign.color.bg} color={redesign.color.muted}>27d</Chip>
        </View>
        <View>
          <Animated.View style={[{ position: 'absolute', top: -34, alignSelf: 'center', zIndex: 2 }, arrow]}>
            <MaterialCommunityIcons name="arrow-down-bold" size={30} color={redesign.color.purple} />
          </Animated.View>
          <View style={{ height: 38, borderRadius: 999, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: typography.fontFamily }}>Apply now</Text>
            <MaterialCommunityIcons name="arrow-right" size={15} color="#fff" />
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
      <Text style={{ fontSize: 15, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>You&apos;re in! 🎉</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '500', color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center' }}>
        The brand accepted your application
      </Text>
    </View>
  )
}

function MockSubmit({ arrow }: { arrow: object }) {
  return (
    <View style={{ width: 244, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, padding: 14, gap: 11, ...redesign.shadow.card }}>
      {/* Approved → post-the-link instruction, matching the deliverable action sheet */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <MaterialCommunityIcons name="check-decagram" size={16} color={redesign.color.successText} />
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Approved — post it &amp; paste the link</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, height: 38, borderRadius: 12, borderWidth: 1, borderColor: redesign.color.hairlineStrong, backgroundColor: redesign.color.bg, justifyContent: 'center', paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 12, color: redesign.color.faint, fontFamily: typography.fontFamily }}>tiktok.com/@you/…</Text>
        </View>
        <View>
          <Animated.View style={[{ position: 'absolute', top: -32, alignSelf: 'center', zIndex: 2 }, arrow]}>
            <MaterialCommunityIcons name="arrow-down-bold" size={28} color={redesign.color.purple} />
          </Animated.View>
          <View style={{ width: 44, height: 38, borderRadius: 12, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="link-variant" size={17} color="#fff" />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <MaterialCommunityIcons name="check-circle" size={13} color={redesign.color.successText} />
        <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: redesign.color.successText, fontFamily: typography.fontFamily }}>LIVE ON TIKTOK</Text>
      </View>
    </View>
  )
}

function MockLeaderboard({ arrow }: { arrow: object }) {
  const rows = [
    { medal: '🥇', label: 'Position 1', you: false },
    { medal: '🥈', label: 'Position 2', you: false },
    { medal: '🥉', label: 'You', you: true },
  ]
  return (
    <View style={{ width: 230, borderRadius: 20, backgroundColor: redesign.color.darkScreen, padding: 12, gap: 8, overflow: 'hidden', ...redesign.shadow.cta }}>
      <LinearGradient pointerEvents="none" colors={['rgba(124,63,242,0.4)', 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.8 }} style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140, borderRadius: 70 }} />
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, borderWidth: r.you ? 1 : 0, borderColor: 'rgba(124,63,242,0.7)', backgroundColor: r.you ? 'rgba(124,63,242,0.22)' : 'rgba(255,255,255,0.05)' }}>
          <Text style={{ fontSize: 15 }}>{r.medal}</Text>
          <Text style={{ flex: 1, color: '#fff', fontSize: 12.5, fontWeight: '800', fontFamily: typography.fontFamily }}>{r.label}</Text>
          <View style={{ backgroundColor: 'rgba(59,214,138,0.16)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: redesign.color.payoutGreen, fontSize: 9, fontWeight: '800', fontFamily: typography.fontFamily }}>REWARD</Text>
          </View>
          {r.you ? (
            <Animated.View style={[{ position: 'absolute', right: -30, top: 8 }, arrow]}>
              <MaterialCommunityIcons name="arrow-left-bold" size={26} color={redesign.color.purple} />
            </Animated.View>
          ) : null}
        </View>
      ))}
    </View>
  )
}

function MockWelcome() {
  return (
    <View style={{ width: 120, height: 120, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...redesign.shadow.cta }}>
      <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', inset: 0 }} />
      <MaterialCommunityIcons name="check-decagram" size={58} color="#fff" />
    </View>
  )
}

function MockLevels() {
  return (
    <View style={{ width: 230, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: 1, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 12, ...redesign.shadow.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LinearGradient colors={redesign.gradient.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 15, padding: 2.5, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flex: 1, alignSelf: 'stretch', borderRadius: 12.5, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="trending-up" size={20} color={redesign.color.cyan} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>Rising creator</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>200 XP to Contender</Text>
        </View>
      </View>
      <View style={{ height: 7, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: '62%', borderRadius: 999, overflow: 'hidden' }}>
          <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  )
}

type Slide = { title: string; body: string; mock: (arrow: object, arrowH: object) => React.ReactNode }

const SLIDES: Slide[] = [
  { title: 'You’re approved! 🎉', body: 'Welcome to LikeLab. Here’s how it works in a few quick steps.', mock: () => <MockWelcome /> },
  { title: 'Discover & apply', body: 'Browse open campaigns and tap Apply on the ones that fit you.', mock: (a) => <MockDiscover arrow={a} /> },
  { title: 'Get selected', body: 'Brands review creators and pick their favourites — you’ll be notified when you’re in.', mock: () => <MockAccepted /> },
  { title: 'Film & get approved', body: 'Upload your video in the app and follow the clear steps — upload, review, post, live. The brand gives the green light (or asks for tweaks).', mock: () => <VideoGridPreview /> },
  { title: 'Post & go live', body: 'Once approved, post it on TikTok and drop the link in the app to confirm it’s live.', mock: (a) => <MockSubmit arrow={a} /> },
  { title: 'Compete & earn', body: 'Your views feed the live leaderboard as they grow — the top creators earn the reward.', mock: (_a, ah) => <MockLeaderboard arrow={ah} /> },
  { title: 'Level up as a creator', body: 'Every time the brand approves your work you earn XP and climb the creator levels — your standing, right in the app.', mock: () => <MockLevels /> },
]

export function TutorialOverlay() {
  const { data: profile } = useCreatorProfile()
  const { width } = useWindowDimensions()
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  // Bumped on every open to remount the ScrollView so it starts fresh at offset 0.
  // Without this the ScrollView keeps its previous offset, and the stale onScroll it
  // fires on re-present overrides setIndex(0) — leaving the tutorial on the last slide.
  const [scrollKey, setScrollKey] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const status = (profile?.reviewStatus || '').toLowerCase().trim()
  const userId = profile?.id
  const shownRef = useRef(false)
  const prevStatusRef = useRef<string | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openAtStart = () => {
    setIndex(0)
    setScrollKey((k) => k + 1)
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
  const arrowSide = useAnimatedStyle(() => ({ transform: [{ translateX: bounce.value * 8 }] }))

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
      SecureStore.setItemAsync(key, '1').catch(() => {})
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
  const nextLabel = isLast ? 'View profile' : 'Next'
  const handleNext = () => {
    haptic.selection()
    if (isLast) { finish(); return }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true })
  }

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish}>
      <View style={{ flex: 1, backgroundColor: redesign.color.bg }}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(124,63,242,0.12)', 'rgba(31,200,232,0.06)', 'transparent']}
          start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.55 }}
          style={{ position: 'absolute', top: 0, right: 0, width: 380, height: 380 }}
        />
        {/* Celebration confetti on the welcome step */}
        {visible && index === 0 ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <ConfettiCannon count={140} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={420} fallSpeed={3200} />
          </View>
        ) : null}
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, height: 40 }}>
            <Text style={{ color: redesign.color.faint, fontFamily: typography.fontFamily, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>HOW IT WORKS</Text>
            {!isLast ? (
              <Pressable onPress={finish} hitSlop={8}>
                <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: '700' }}>Skip</Text>
              </Pressable>
            ) : <View style={{ width: 1 }} />}
          </View>

          <ScrollView
            key={scrollKey}
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width)
              if (i !== index) setIndex(i)
            }}
            style={{ flex: 1 }}
          >
            {SLIDES.map((slide, i) => (
              <View key={slide.title} style={{ width, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ minHeight: 240, justifyContent: 'center', marginBottom: 36 }}>
                  {i === index ? <Animated.View entering={FadeIn.duration(260)}>{slide.mock(arrowDown, arrowSide)}</Animated.View> : slide.mock(arrowDown, arrowSide)}
                </View>
                <Text style={{ color: redesign.color.ink, fontFamily: typography.fontFamily, fontSize: 25, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 }}>
                  {slide.title}
                </Text>
                <Text style={{ color: redesign.color.muted, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '500', lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>
                  {slide.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 }}>
            {SLIDES.map((_, i) => (
              <View key={i} style={{ width: i === index ? 22 : 7, height: 7, borderRadius: 999, backgroundColor: i === index ? redesign.color.purple : redesign.color.hairlineStrong }} />
            ))}
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
            <Pressable
              onPress={handleNext}
              style={{ minHeight: 54, borderRadius: 999, backgroundColor: redesign.color.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...redesign.shadow.cta }}
            >
              <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>{nextLabel}</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  )
}
