import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import ConfettiCannon from 'react-native-confetti-cannon'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import { WHATS_NEW, hasSeenWhatsNew, markWhatsNewSeen } from '@/features/whatsnew/whatsNew'
import { VideoGridPreview } from '@/features/shared/ui/VideoGridPreview'

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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingLeft: 9, paddingRight: 11, paddingVertical: 6, backgroundColor: 'rgba(124,63,242,0.10)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(124,63,242,0.35)' }}
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

function MockLevels() {
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
    <View style={{ width: 230, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 16, gap: 12, ...redesign.shadow.card }}>
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
      <View style={{ height: 8, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, barStyle]}>
          <LinearGradient colors={redesign.gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </View>
  )
}

function MockInstant() {
  const pulse = usePulse(0.08)
  return (
    <View style={{ width: 230, borderRadius: 20, backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 14, gap: 10, ...redesign.shadow.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(16,159,110,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="check-decagram" size={18} color={redesign.color.successText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow Kit · Video 1</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.successText, fontFamily: typography.fontFamily }}>Approved just now</Text>
        </View>
      </View>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingLeft: 9, paddingRight: 12, paddingVertical: 6, backgroundColor: redesign.color.ink }, pulse]}>
        <MaterialCommunityIcons name="message-text" size={13} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', fontFamily: typography.fontFamily }}>New feedback from the brand</Text>
      </Animated.View>
    </View>
  )
}

function MockDiscover() {
  const pulse = usePulse(0.05)
  return (
    <View style={{ width: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: redesign.color.card, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, ...redesign.shadow.card }}>
      <View style={{ height: 74 }}>
        <LinearGradient colors={['rgba(124,63,242,0.45)', 'rgba(31,200,232,0.22)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingLeft: 7, paddingRight: 9, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <MaterialCommunityIcons name="star-four-points" size={9} color={redesign.color.purple} />
          <Text style={{ color: redesign.color.ink, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, fontFamily: typography.fontFamily }}>FEATURED</Text>
        </View>
      </View>
      <View style={{ padding: 12, gap: 9 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow Kit launch</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(124,63,242,0.10)' }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.purple, fontFamily: typography.fontFamily }}>REWARD · CASH</Text>
          </View>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: redesign.color.bg }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: redesign.color.muted, fontFamily: typography.fontFamily }}>3d left</Text>
          </View>
        </View>
        <Animated.View style={[{ height: 34, borderRadius: 12, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, pulse]}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', fontFamily: typography.fontFamily }}>View &amp; apply</Text>
          <MaterialCommunityIcons name="arrow-right" size={15} color="#fff" />
        </Animated.View>
      </View>
    </View>
  )
}

type WhatsNewSlide = { title: string; body: string; mock: () => React.ReactNode }

const SLIDES: WhatsNewSlide[] = [
  {
    title: 'A whole new video flow',
    body: 'Your campaign videos now live in a clean grid — every video clearly tagged with what to do next.',
    mock: () => <VideoGridPreview />,
  },
  {
    title: 'Creator Levels are here',
    body: 'Earn XP from brand-approved work and climb the levels. Your standing as a creator, finally visible.',
    mock: () => <MockLevels />,
  },
  {
    title: 'Everything updates instantly',
    body: 'Approvals, feedback and invitations now arrive live — no more pull-to-refresh.',
    mock: () => <MockInstant />,
  },
  {
    title: 'A fresh Discover',
    body: 'A redesigned home that puts a featured campaign and your active work front and centre.',
    mock: () => <MockDiscover />,
  },
]

function WhatsNewModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)
  const cardW = width - 24
  const last = index >= SLIDES.length - 1

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
          entering={ZoomIn.springify().damping(15).mass(0.7)}
          style={{ width: cardW, backgroundColor: redesign.color.card, borderRadius: 30, overflow: 'hidden', ...redesign.shadow.cta }}
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
            <Text style={{ fontFamily: typography.fontFamily, fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.7, lineHeight: 28, marginTop: 16 }}>
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
              {SLIDES.map((slide) => (
                <View key={slide.title} style={{ width: cardW, paddingHorizontal: 24, alignItems: 'center' }}>
                  <View style={{ height: Math.min(208, height * 0.27), alignItems: 'center', justifyContent: 'center' }}>{slide.mock()}</View>
                  <Text style={{ fontFamily: typography.fontFamily, fontSize: 22, fontWeight: '800', color: redesign.color.ink, letterSpacing: -0.5, textAlign: 'center', marginTop: 8 }}>
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
              <Pressable onPress={goNext} style={{ minHeight: 54, borderRadius: 17, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                <Text style={{ color: '#fff', fontFamily: typography.fontFamily, fontSize: 16, fontWeight: '800' }}>{last ? 'Got it' : 'Next'}</Text>
                {last ? null : <MaterialCommunityIcons name="arrow-right" size={19} color="#fff" />}
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
