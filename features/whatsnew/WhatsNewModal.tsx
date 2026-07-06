import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { Reveal, useReveal } from '@/features/shared/ui/motion'
import ConfettiCannon from 'react-native-confetti-cannon'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import { WHATS_NEW, hasSeenWhatsNew, markWhatsNewSeen } from '@/features/whatsnew/whatsNew'
import { ProjectCardPreview } from '@/features/shared/ui/ProjectCardPreview'

// ── Module-level opener (Toast pattern) so the AppHeader CTA can open the single
//    modal owned by <WhatsNewHost />. ──────────────────────────────────────────
let _setOpen: ((v: boolean) => void) | null = null
export function openWhatsNew() {
  haptic.light()
  _setOpen?.(true)
}

// The corner CTA. Renders nothing when switched off, so the next release removes
// it by flipping WHATS_NEW.enabled to false.
export function WhatsNewButton() {
  if (!WHATS_NEW.enabled) return null
  return (
    <Pressable
      onPress={openWhatsNew}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="What's new"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 6, backgroundColor: 'rgba(99,80,184,0.10)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(99,80,184,0.35)' }}
    >
      <MaterialCommunityIcons name="star-four-points" size={13} color={redesign.color.purple} />
      <Text style={{ color: redesign.color.purple, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: '800', letterSpacing: -0.1 }}>New</Text>
    </Pressable>
  )
}

// ── Animated mockups — each mirrors the real new UI with one looping motion. ────

// A gentle breathing pulse shared by the actionable affordances.
function usePulse(amount = 0.06) {
  const v = useSharedValue(0)
  useEffect(() => {
    v.value = withRepeat(withSequence(withTiming(1, { duration: 950, easing: Easing.inOut(Easing.ease) }), withTiming(0, { duration: 950, easing: Easing.inOut(Easing.ease) })), -1, false)
    return () => {
      v.value = 0
    }
  }, [v])
  return useAnimatedStyle(() => ({ transform: [{ scale: 1 + v.value * amount }] }))
}

function MockLevels({ active }: { active: boolean }) {
  const p = useReveal(active)
  const fill = useSharedValue(0.1)
  useEffect(() => {
    fill.value = withRepeat(
      withSequence(
        withTiming(0.62, { duration: 1300, easing: Easing.out(Easing.cubic) }),
        withTiming(0.62, { duration: 700 }),
        withTiming(0.1, { duration: 0 }),
      ),
      -1,
      false,
    )
    return () => {
      fill.value = 0.1
    }
  }, [fill])
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }))
  return (
    <View style={{ width: 290, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, paddingVertical: 12, ...redesign.shadow.card }}>
      <Reveal p={p} index={0}>
        {/* Tier ring emblem — mirrors the real TierRow */}
        <View style={{ width: 36, height: 36, borderRadius: 13, borderWidth: 2, borderColor: redesign.color.purple, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="star-four-points" size={16} color={redesign.color.purple} />
        </View>
      </Reveal>
      <View style={{ flex: 1, gap: 6 }}>
        <Reveal p={p} index={1} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>Rising creator</Text>
          <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>200 to Pro</Text>
        </Reveal>
        <Reveal p={p} index={2} style={{ height: 6, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, barStyle]}>
            <View style={{ flex: 1, backgroundColor: redesign.color.purple }} />
          </Animated.View>
        </Reveal>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={redesign.color.faint} />
    </View>
  )
}

function MockInstant({ active }: { active: boolean }) {
  const p = useReveal(active)
  const pulse = usePulse(0.08)
  return (
    <View style={{ width: 230, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 14, gap: 10, ...redesign.shadow.card }}>
      <Reveal p={p} index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(16,159,110,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="check-decagram" size={18} color={redesign.color.successText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow Kit · Video 1</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.successText, fontFamily: typography.fontFamily }}>Approved just now</Text>
        </View>
      </Reveal>
      <Reveal p={p} index={1} style={{ alignSelf: 'flex-start' }}>
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingLeft: 9, paddingRight: 12, paddingVertical: 6, backgroundColor: redesign.color.ink }, pulse]}>
          <MaterialCommunityIcons name="message-text" size={13} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: typography.fontFamily }}>New feedback from the brand</Text>
        </Animated.View>
      </Reveal>
    </View>
  )
}

function MockDiscover({ active }: { active: boolean }) {
  const p = useReveal(active)
  const pulse = usePulse(0.05)
  return (
    <View style={{ width: 236, borderRadius: 26, padding: 4, backgroundColor: 'rgba(11,11,15,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong }}>
      {/* Double-bezel mini of the real FeaturedCampaign card */}
      <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: redesign.color.card, ...redesign.shadow.card }}>
        <Reveal p={p} index={0} style={{ height: 82 }}>
          <LinearGradient colors={['rgba(99,80,184,0.45)', 'rgba(99,80,184,0.15)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44 }} />
          <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 7, paddingRight: 9, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.92)' }}>
            <MaterialCommunityIcons name="star-four-points" size={9} color={redesign.color.purple} />
            <Text style={{ color: redesign.color.ink, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, fontFamily: typography.fontFamily }}>FEATURED</Text>
          </View>
        </Reveal>
        <View style={{ padding: 12, gap: 8 }}>
          <Reveal p={p} index={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(99,80,184,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8, fontWeight: '900', color: redesign.color.purple, fontFamily: typography.fontFamily }}>C</Text>
            </View>
            <Text style={{ color: redesign.color.muted, fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily }}>ClearSkin</Text>
          </Reveal>
          <Reveal p={p} index={2}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, lineHeight: 19, fontFamily: typography.fontFamily }}>Glow Kit launch</Text>
          </Reveal>
          <Reveal p={p} index={3} style={{ flexDirection: 'row', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(99,80,184,0.10)' }}>
              <MaterialCommunityIcons name="gift-outline" size={10} color={redesign.color.purple} />
              <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.purple, fontFamily: typography.fontFamily }}>Cash</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: redesign.color.bg }}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={10} color={redesign.color.muted} />
              <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.muted, fontFamily: typography.fontFamily }}>3d left</Text>
            </View>
          </Reveal>
          <Reveal p={p} index={4}>
            <Animated.View style={[{ height: 38, borderRadius: 13, paddingHorizontal: 12, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, pulse]}>
              <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800', fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>View &amp; apply</Text>
              <View style={{ position: 'absolute', right: 5, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="arrow-top-right" size={13} color="#fff" />
              </View>
            </Animated.View>
          </Reveal>
        </View>
      </View>
    </View>
  )
}

type WhatsNewSlide = { title: string; body: string; mock: (active: boolean) => React.ReactNode }

const SLIDES: WhatsNewSlide[] = [
  {
    title: 'Your work, all in one place',
    body: 'The new Projects hub shows each campaign as a card — clearly tagged with exactly what to do next.',
    mock: () => <ProjectCardPreview />,
  },
  {
    title: 'Creator Levels are here',
    body: 'Earn XP from brand-approved work and climb the levels. Your standing as a creator, finally visible.',
    mock: (active) => <MockLevels active={active} />,
  },
  {
    title: 'Everything updates instantly',
    body: 'Approvals, feedback and invitations now arrive live — no more pull-to-refresh.',
    mock: (active) => <MockInstant active={active} />,
  },
  {
    title: 'A fresh Discover',
    body: 'A redesigned Discover that leads with a featured campaign and what’s open to you right now.',
    mock: (active) => <MockDiscover active={active} />,
  },
]

function WhatsNewModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)
  const cardW = width - 24
  const last = index >= SLIDES.length - 1

  // Unfold entrance — the card springs open vertically (scaleY) like it's unfolding.
  const unfold = useSharedValue(0)
  useEffect(() => {
    if (visible) {
      unfold.value = 0
      unfold.value = withSpring(1, { damping: 13, stiffness: 150, mass: 0.9 })
    } else {
      unfold.value = 0
    }
  }, [visible, unfold])
  const unfoldStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, unfold.value * 3),
    transform: [{ perspective: 900 }, { scaleY: 0.03 + unfold.value * 0.97 }],
  }))

  const goNext = () => {
    haptic.selection()
    if (last) {
      onClose()
      return
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * cardW, animated: true })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(8,8,15,0.72)', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
        {/* Celebration burst — this is the biggest update ever */}
        {visible ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <ConfettiCannon count={130} origin={{ x: width / 2, y: -20 }} autoStart fadeOut explosionSpeed={480} fallSpeed={4200} />
          </View>
        ) : null}

        <Animated.View
          style={[{ width: cardW, backgroundColor: redesign.color.card, borderRadius: 30, overflow: 'hidden', ...redesign.shadow.cta }, unfoldStyle]}
        >
          {/* Gradient hero header — the attention-grabber (brand purple, not rainbow) */}
          <LinearGradient colors={['#8B4DF7', '#6A2CD6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top > 24 ? 18 : 20, paddingHorizontal: 20, paddingBottom: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingLeft: 9, paddingRight: 13, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.22)' }}>
                <MaterialCommunityIcons name="star-four-points" size={13} color="#fff" />
                <Text style={{ fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: '900', color: '#fff', letterSpacing: 0.6 }}>WHAT&apos;S NEW</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 29, fontWeight: '900', color: '#fff', letterSpacing: -1, lineHeight: 32, marginTop: 16 }}>
              {WHATS_NEW.headline}
            </Text>
          </LinearGradient>

          {/* Body */}
          <View style={{ paddingTop: 20, paddingBottom: 18 + Math.max(0, insets.bottom - 8) }}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / cardW))}
              style={{ width: cardW }}
            >
              {SLIDES.map((slide, i) => (
                <View key={slide.title} style={{ width: cardW, paddingHorizontal: 24, alignItems: 'center' }}>
                  <View style={{ height: Math.min(236, height * 0.31), alignItems: 'center', justifyContent: 'center' }}>{slide.mock(index === i)}</View>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 25, fontWeight: '900', color: redesign.color.ink, letterSpacing: -0.8, textAlign: 'center', marginTop: 8 }}>
                    {slide.title}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 14.5, fontWeight: '500', color: redesign.color.muted, lineHeight: 21, textAlign: 'center', marginTop: 9 }}>
                    {slide.body}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Dots */}
            <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 6, marginTop: 18, marginBottom: 16 }}>
              {SLIDES.map((s, i) => (
                <View key={s.title} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? redesign.color.purple : redesign.color.hairlineStrong }} />
              ))}
            </View>

            {/* CTA */}
            <View style={{ paddingHorizontal: 20 }}>
              <Pressable onPress={goNext} style={{ minHeight: 56, borderRadius: 18, paddingHorizontal: 18, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 }}>{last ? 'Got it' : 'Next'}</Text>
                {last ? null : (
                  <View style={{ position: 'absolute', right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// Mounted once inside the authenticated tabs tree. Owns the modal, registers the
// global opener, and auto-shows the announcement once for returning (approved)
// creators — new users still in onboarding are skipped, but can open it via the CTA.
export function WhatsNewHost() {
  const [open, setOpen] = useState(false)
  const { data: profile } = useCreatorProfile()

  useEffect(() => {
    _setOpen = setOpen
    return () => {
      _setOpen = null
    }
  }, [])

  useEffect(() => {
    if (!WHATS_NEW.enabled || profile?.approved !== true) return
    let active = true
    hasSeenWhatsNew().then((seen) => {
      if (active && !seen) setOpen(true)
    })
    return () => {
      active = false
    }
  }, [profile?.approved])

  const close = () => {
    setOpen(false)
    void markWhatsNewSeen()
  }

  if (!WHATS_NEW.enabled) return null
  return <WhatsNewModal visible={open} onClose={close} />
}
