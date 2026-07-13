import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, useWindowDimensions, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { Reveal, useReveal } from '@/features/shared/ui/motion'
import { HeartBurst } from '@/features/shared/ui/HeartBurst'
import { redesign, typography } from '@/features/core/theme'
import { useCreatorProfile } from '@/features/profile/hooks'
import { haptic } from '@/features/shared/haptics'
import * as Haptics from 'expo-haptics'
import * as SecureStore from 'expo-secure-store'
import { WHATS_NEW, hasSeenWhatsNew, markWhatsNewSeen } from '@/features/whatsnew/whatsNew'
import { SEEN_PREFIX as TUTORIAL_SEEN_PREFIX } from '@/features/onboarding/TutorialOverlay'
import { useCelebrationSlot } from '@/features/shared/celebrationSlot'
import { ElectricBorder } from '@/features/shared/ui/ElectricBorder'
import { ProjectCardPreview } from '@/features/shared/ui/ProjectCardPreview'
import { TierCoin } from '@/features/shared/ui/TierBorder'

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

// The signature interaction — the hold-to-apply button charging on loop.
function MockHold({ active }: { active: boolean }) {
  const p = useReveal(active)
  const charge = useSharedValue(0)
  useEffect(() => {
    charge.value = withRepeat(
      withSequence(withTiming(0, { duration: 600 }), withTiming(1, { duration: 1500, easing: Easing.linear }), withTiming(1, { duration: 500 })),
      -1,
      false
    )
    return () => { charge.value = 0 }
  }, [charge])
  const fill = useAnimatedStyle(() => ({ width: `${charge.value * 100}%` }))
  return (
    <View style={{ width: 250, gap: 10 }}>
      <Reveal p={p} index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 12, ...redesign.shadow.card }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(99,80,184,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="star-four-points" size={15} color={redesign.color.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow Kit launch</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>ClearSkin · 3d left</Text>
        </View>
      </Reveal>
      <Reveal p={p} index={1}>
        <View style={{ height: 50, borderRadius: 999, backgroundColor: 'rgba(8,8,12,0.96)', overflow: 'hidden', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#26262E' }, fill]}>
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.85)' }} />
          </Animated.View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="gesture-tap-hold" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily }}>Hold to apply</Text>
          </View>
        </View>
      </Reveal>
    </View>
  )
}

// Gold + Partner frames, side by side — the partner one is the REAL live border.
function MockTiers({ active }: { active: boolean }) {
  const p = useReveal(active)
  return (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <Reveal p={p} index={0}>
        <View style={{ borderRadius: 19, padding: 3.5, overflow: 'hidden' }}>
          <LinearGradient colors={['#F7E7A9', '#D4A537', '#B8860B', '#F1D585']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ width: 100, height: 122, borderRadius: 15, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <TierCoin tier="gold" size={30} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Gold</Text>
          </View>
        </View>
      </Reveal>
      <Reveal p={p} index={1}>
        <ElectricBorder radius={19} color="#7C5CFF">
          <View style={{ width: 107, height: 129, borderRadius: 19, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <TierCoin tier="partner" size={30} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Partner</Text>
          </View>
        </ElectricBorder>
      </Reveal>
    </View>
  )
}

// The five-second glance card from the new campaign page.
function MockGlance({ active }: { active: boolean }) {
  const p = useReveal(active)
  const rows = [
    { icon: 'gift-outline' as const, label: 'YOU GET', value: '1 × product to keep' },
    { icon: 'video-outline' as const, label: 'YOU MAKE', value: '2 TikTok videos' },
    { icon: 'clock-outline' as const, label: 'DEADLINE', value: '8 days left' },
  ]
  return (
    <View style={{ width: 258, backgroundColor: redesign.color.card, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, ...redesign.shadow.card }}>
      {rows.map((row, i) => (
        <Reveal key={row.label} p={p} index={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: redesign.color.hairlineStrong }}>
          <MaterialCommunityIcons name={row.icon} size={14} color={redesign.color.faint} />
          <Text style={{ flex: 1, fontSize: 9, fontWeight: '800', color: redesign.color.faint, letterSpacing: 1, fontFamily: typography.fontFamily }}>{row.label}</Text>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>{row.value}</Text>
        </Reveal>
      ))}
    </View>
  )
}

// Post straight to TikTok — approved video flies into the TikTok inbox.
function MockTikTok({ active }: { active: boolean }) {
  const p = useReveal(active)
  const fly = useSharedValue(0)
  useEffect(() => {
    fly.value = withRepeat(
      withSequence(withTiming(0, { duration: 600 }), withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 400 })),
      -1,
      false
    )
    return () => { fly.value = 0 }
  }, [fly])
  const plane = useAnimatedStyle(() => ({
    transform: [{ translateX: fly.value * 30 }, { translateY: fly.value * -12 }],
    opacity: 1 - fly.value * 0.95,
  }))
  return (
    <View style={{ width: 250, gap: 10 }}>
      <Reveal p={p} index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, padding: 12, ...redesign.shadow.card }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(16,159,110,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="check-decagram" size={16} color={redesign.color.successText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily }}>Glow routine 🎬</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: redesign.color.successText, fontFamily: typography.fontFamily }}>Approved — ready to post</Text>
        </View>
      </Reveal>
      <Reveal p={p} index={1}>
        <View style={{ height: 50, borderRadius: 999, backgroundColor: '#010101', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' }}>
          <MaterialCommunityIcons name="music-note" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily }}>Send to TikTok</Text>
          <Animated.View style={[{ position: 'absolute', right: 16 }, plane]}>
            <MaterialCommunityIcons name="send" size={15} color="#fff" />
          </Animated.View>
        </View>
      </Reveal>
      <Reveal p={p} index={2}>
        <Text style={{ fontSize: 11.5, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily, textAlign: 'center' }}>
          Lands in your TikTok inbox — post it from there
        </Text>
      </Reveal>
    </View>
  )
}

// Haptics — expanding rings off a fingertip.
function MockFeel({ active }: { active: boolean }) {
  const p = useReveal(active)
  const ring = useSharedValue(0)
  useEffect(() => {
    ring.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1, false)
    return () => { ring.value = 0 }
  }, [ring])
  const r1 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ring.value * 0.9 }], opacity: (1 - ring.value) * 0.5 }))
  const r2 = useAnimatedStyle(() => ({ transform: [{ scale: 1 + ring.value * 1.6 }], opacity: (1 - ring.value) * 0.28 }))
  return (
    <Reveal p={p} index={0} style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: redesign.color.purple }, r1]} />
      <Animated.View style={[{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, borderColor: redesign.color.purple }, r2]} />
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center', ...redesign.shadow.cta }}>
        <MaterialCommunityIcons name="gesture-tap" size={28} color="#fff" />
      </View>
    </Reveal>
  )
}

// Brand → creator feedback as an SMS-style chat.
function MockChat({ active }: { active: boolean }) {
  const p = useReveal(active)
  return (
    <View style={{ width: 250, gap: 8 }}>
      <Reveal p={p} index={0} style={{ alignSelf: 'flex-start', maxWidth: 210, backgroundColor: redesign.color.card, borderRadius: 16, borderBottomLeftRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 13, paddingVertical: 9, ...redesign.shadow.card }}>
        <Text style={{ fontSize: 9.5, fontWeight: '800', color: redesign.color.purple, fontFamily: typography.fontFamily, marginBottom: 2 }}>CLEARSKIN</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: redesign.color.ink, fontFamily: typography.fontFamily, lineHeight: 17 }}>Love it! Can you tighten the hook in the first 2s? 🔥</Text>
      </Reveal>
      <Reveal p={p} index={1} style={{ alignSelf: 'flex-end', backgroundColor: redesign.color.ink, borderRadius: 16, borderBottomRightRadius: 5, paddingHorizontal: 13, paddingVertical: 9 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: '#fff', fontFamily: typography.fontFamily }}>On it 🙌</Text>
      </Reveal>
      <Reveal p={p} index={2} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(99,80,184,0.10)' }}>
        <MaterialCommunityIcons name="message-text" size={12} color={redesign.color.purple} />
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: redesign.color.purple, fontFamily: typography.fontFamily }}>Right on each video</Text>
      </Reveal>
    </View>
  )
}

// Creator levels — tier row with the XP bar filling on loop.
function MockLevels({ active }: { active: boolean }) {
  const p = useReveal(active)
  const fill = useSharedValue(0.1)
  useEffect(() => {
    fill.value = withRepeat(
      withSequence(
        withTiming(0.62, { duration: 1300, easing: Easing.out(Easing.cubic) }),
        withTiming(0.62, { duration: 700 }),
        withTiming(0.1, { duration: 0 })
      ),
      -1,
      false
    )
    return () => { fill.value = 0.1 }
  }, [fill])
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }))
  return (
    <View style={{ width: 270, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 14, paddingVertical: 12, ...redesign.shadow.card }}>
      <Reveal p={p} index={0}>
        <View style={{ width: 36, height: 36, borderRadius: 13, borderWidth: 2, borderColor: redesign.color.purple, backgroundColor: redesign.color.card, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="star-four-points" size={16} color={redesign.color.purple} />
        </View>
      </Reveal>
      <View style={{ flex: 1, gap: 6 }}>
        <Reveal p={p} index={1} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13.5, fontWeight: '800', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: -0.2 }}>Rising creator</Text>
          <Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '600', color: redesign.color.muted, fontFamily: typography.fontFamily }}>2 to Pro</Text>
        </Reveal>
        <Reveal p={p} index={2} style={{ height: 6, borderRadius: 999, backgroundColor: redesign.color.hairlineStrong, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: redesign.color.purple }, barStyle]} />
        </Reveal>
      </View>
    </View>
  )
}

// TikTok-style portfolio grid on the profile.
function MockGrid({ active }: { active: boolean }) {
  const p = useReveal(active)
  const views = ['12.4K', '8.1K', '31K', '5.2K', '19K', '2.8K']
  return (
    <View style={{ width: 252, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {views.map((v, i) => (
        <Reveal key={i} p={p} index={i} style={{ width: 80, height: 104, borderRadius: 12, backgroundColor: '#15151F', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient colors={['rgba(99,80,184,0.35)', 'rgba(11,11,15,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          <MaterialCommunityIcons name="play" size={20} color="rgba(255,255,255,0.85)" />
          <View style={{ position: 'absolute', bottom: 6, left: 7, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <MaterialCommunityIcons name="eye-outline" size={10} color="rgba(255,255,255,0.8)" />
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: 'rgba(255,255,255,0.9)', fontFamily: typography.fontFamily }}>{v}</Text>
          </View>
        </Reveal>
      ))}
    </View>
  )
}

// Invite friends — code pill + Connector badge.
function MockInvite({ active }: { active: boolean }) {
  const p = useReveal(active)
  return (
    <View style={{ width: 250, gap: 10, alignItems: 'center' }}>
      <Reveal p={p} index={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: redesign.color.card, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: redesign.color.hairlineStrong, paddingHorizontal: 16, paddingVertical: 12, ...redesign.shadow.card }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: redesign.color.ink, fontFamily: typography.fontFamily, letterSpacing: 2 }}>ELI-4X2</Text>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: redesign.color.ink, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="content-copy" size={14} color="#fff" />
        </View>
      </Reveal>
      <Reveal p={p} index={1} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(99,80,184,0.10)' }}>
        <MaterialCommunityIcons name="account-group" size={14} color={redesign.color.purple} />
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: redesign.color.purple, fontFamily: typography.fontFamily }}>3 friends join → Connector badge</Text>
      </Reveal>
    </View>
  )
}

type WhatsNewSlide = { title: string; body: string; mock: (active: boolean) => React.ReactNode }

const SLIDES: WhatsNewSlide[] = [
  {
    title: 'Hold to apply',
    body: 'Applying is a hold, not a tap — charge the button and feel it rumble all the way to sent.',
    mock: (active) => <MockHold active={active} />,
  },
  {
    title: 'Gold & Partner campaigns',
    body: 'The biggest collabs now stand out on sight — a gold frame for Gold campaigns, a live electric frame for official LikeLab partners.',
    mock: (active) => <MockTiers active={active} />,
  },
  {
    title: 'A calmer campaign page',
    body: 'What you get, what you make and the deadline — answered in five seconds. Accepted? A guided walkthrough shows you exactly how to nail it.',
    mock: (active) => <MockGlance active={active} />,
  },
  {
    title: 'Post straight to TikTok',
    body: 'Approved videos fly into your TikTok inbox with one tap — no downloads, no re-uploads. Open TikTok, tap it, post.',
    mock: (active) => <MockTikTok active={active} />,
  },
  {
    title: 'Projects is now Your studio',
    body: 'Every campaign is a card that tells you exactly what to do next — upload, post, done.',
    mock: () => <ProjectCardPreview />,
  },
  {
    title: 'Chat with brands',
    body: 'Feedback now lands as a conversation on each video — reply, tweak, resubmit without leaving the app.',
    mock: (active) => <MockChat active={active} />,
  },
  {
    title: 'Creator levels',
    body: 'Every completed campaign moves you up the ladder — your standing as a creator, visible in the app.',
    mock: (active) => <MockLevels active={active} />,
  },
  {
    title: 'Your videos, your portfolio',
    body: 'A TikTok-style grid of everything you have posted, with views and likes tracked in Insights.',
    mock: (active) => <MockGrid active={active} />,
  },
  {
    title: 'Bring your friends',
    body: 'Share your invite code — when 3 creators join, you earn the Connector badge.',
    mock: (active) => <MockInvite active={active} />,
  },
  {
    title: 'It feels alive',
    body: 'New motion and haptics across the whole app — every tap, pull and hold now answers back.',
    mock: (active) => <MockFeel active={active} />,
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
      // The Modal unmounts its children while hidden, so the ScrollView remounts at
      // slide 0 on reopen — reset index to match, or the dots/CTA point at a stale
      // slide and the first tap closes instead of advancing.
      setIndex(0)
      scrollRef.current?.scrollTo({ x: 0, animated: false })
      unfold.value = 0
      unfold.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
    } else {
      unfold.value = 0
    }
  }, [visible, unfold])
  const unfoldStyle = useAnimatedStyle(() => ({
    opacity: unfold.value,
    transform: [{ scale: 0.94 + unfold.value * 0.06 }],
  }))

  // Full-power haptic demo — the "It feels alive" slide doesn't tell, it shows:
  // continuous system vibration + stacked Heavy/Rigid impacts for a second.
  const blastTimerRef = useRef<{ iv: ReturnType<typeof setInterval>; to: ReturnType<typeof setTimeout> } | null>(null)
  const stopBlast = () => {
    if (!blastTimerRef.current) return
    clearInterval(blastTimerRef.current.iv)
    clearTimeout(blastTimerRef.current.to)
    blastTimerRef.current = null
    Vibration.cancel()
  }
  useEffect(() => () => stopBlast(), [])
  const feelTheApp = () => {
    stopBlast()
    Vibration.vibrate([0, 1], true)
    const iv = setInterval(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    }, 32)
    const to = setTimeout(() => stopBlast(), 900)
    blastTimerRef.current = { iv, to }
  }

  const goNext = () => {
    if (SLIDES[index]?.title === 'It feels alive') feelTheApp()
    else haptic.selection()
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
            <HeartBurst count={26} origin={{ x: width / 2, y: height * 0.3 }} />
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
                <View key={s.title} style={{ width: i === index ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? redesign.color.ink : redesign.color.hairlineStrong }} />
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
    if (!WHATS_NEW.enabled || profile?.approved !== true || !profile?.id) return
    let active = true
    // Only auto-open for RETURNING creators — those who have already completed the
    // onboarding tutorial (its per-user seen flag is set). A creator who was just
    // approved for the first time has that flag unset; auto-opening here would race
    // the 500ms-deferred TutorialOverlay Modal and, since iOS presents one modal at
    // a time, silently drop the one-time onboarding tutorial. The corner CTA still
    // lets any creator open this announcement manually.
    Promise.all([
      hasSeenWhatsNew(),
      SecureStore.getItemAsync(`${TUTORIAL_SEEN_PREFIX}${profile.id}`),
    ]).then(([seenWhatsNew, tutorialSeen]) => {
      if (active && !seenWhatsNew && tutorialSeen) setOpen(true)
    })
    return () => {
      active = false
    }
  }, [profile?.approved, profile?.id])

  const close = () => {
    setOpen(false)
    void markWhatsNewSeen()
  }

  // Share the single iOS modal slot with the celebration hosts. Held only while open,
  // so the manual corner CTA still opens it (queuing behind a live celebration if one
  // is up); markWhatsNewSeen only runs on an actual close, never while queued.
  const active = useCelebrationSlot('whatsnew', open)

  if (!WHATS_NEW.enabled) return null
  return <WhatsNewModal visible={open && active} onClose={close} />
}
