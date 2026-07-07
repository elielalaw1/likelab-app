import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, Vibration, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useAudioPlayer } from 'expo-audio'
import Animated, {
  Easing,
  type SharedValue,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { redesign, typography } from '@/features/core/theme'

// Hold-to-apply: the creator holds the button for HOLD_MS while a glossy charcoal
// fill charges and the haptics run at full saturation the whole way. The button
// itself stays perfectly still — all drama lives in the haptics. Releasing early softly reverses
// the fill and nothing is sent; completing the hold fires success haptics and hands
// off to the EXISTING apply flow (validation + Terms gate live in the screen's
// handleApply — this component owns only the interaction).

const HOLD_MS = 1800

// Two-note chime played in sync with the success haptic — the Apple Pay moment.
const chime = require('@/assets/sounds/apply-chime.wav')

// Continuous shake at maximum hardware strength. Discrete Haptics transients can
// never feel like sustained shaking — so the base layer is the legacy system
// vibrator (react-native's Vibration API → AudioServicesPlaySystemSound), the same
// raw full-power buzz as an incoming call, looped back-to-back for the whole hold.
// On top of that, Heavy+Rigid impacts every ~32ms add sharp texture (each transient
// needs ~25-30ms to play at full amplitude; tighter packing gets coalesced by iOS
// into a weaker smear — we measured that the hard way).
const SALVO_INTERVAL_MS = 32
// iOS ignores vibration durations (each burst is ~400ms fixed); the pattern only
// controls the gaps. [0, 1] with repeat = bursts back to back = continuous shake.
const CONTINUOUS_PATTERN = [0, 1]

// Every 5th salvo (~160ms) also fires the Error notification pattern — iOS's
// strongest built-in multi-buzz — woven into the constant vibrator roar.
let salvoCount = 0
function salvo() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
  salvoCount++
  if (salvoCount % 5 === 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
}

export function HoldToApplyButton({
  label,
  onComplete,
  minHeight = 54,
  chargeSV,
}: {
  label: string
  /** Fired once when the hold completes — wire the screen's existing handleApply here. */
  onComplete: () => void
  minHeight?: number
  /** Optional mirror of the charge progress (0..1) — drives screen-level effects
      like the edge glow without lifting any state. */
  chargeSV?: SharedValue<number>
}) {
  const internalProgress = useSharedValue(0)
  const progress = chargeSV ?? internalProgress
  const chimePlayer = useAudioPlayer(chime)
  // POP BOOM on completion: squash→overshoot scale, a white flash, and two
  // shockwave rings expanding off the button.
  const pop = useSharedValue(1)
  const flash = useSharedValue(0)
  const ring1 = useSharedValue(1)
  const ring2 = useSharedValue(1)
  const [btnW, setBtnW] = useState(0)
  const salvoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Guards double-fire between the animation callback and a trailing pressOut, and
  // blocks an immediate re-hold while the completed state settles.
  const completedRef = useRef(false)

  const stopSalvos = () => {
    Vibration.cancel()
    if (salvoTimerRef.current) {
      clearInterval(salvoTimerRef.current)
      salvoTimerRef.current = null
    }
  }

  useEffect(() => () => {
    cancelAnimation(progress)
    stopSalvos()
  }, [progress])

  const finishHold = () => {
    if (completedRef.current) return
    completedRef.current = true
    stopSalvos()
    // Final slam: one full-length vibrator burst under the success pattern —
    // with the chime landing on the same beat (respects the silent switch).
    Vibration.vibrate(400)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    try {
      chimePlayer.seekTo(0)
      chimePlayer.play()
    } catch {
      // Audio is garnish — never let it break the apply flow.
    }
    // POP BOOM — squash, overshoot, settle; flash; shockwaves.
    pop.value = withSequence(
      withTiming(0.93, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(1.07, { damping: 9, stiffness: 320 }),
      withSpring(1, { damping: 14, stiffness: 220 })
    )
    flash.value = 1
    flash.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) })
    ring1.value = 0
    ring1.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
    ring2.value = 0
    ring2.value = withDelay(90, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }))
    // Let the boom land before the Terms sheet slides over it.
    setTimeout(() => onComplete(), 320)
    // Relax the fill and re-arm shortly after: handleApply opens the Terms sheet,
    // and if the creator dismisses it without accepting they must be able to
    // charge the button again.
    progress.value = withDelay(500, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }))
    setTimeout(() => { completedRef.current = false }, 1000)
  }

  const startHold = () => {
    if (completedRef.current) return
    // Max intensity from the very first millisecond — no ramp, just the wall.
    stopSalvos()
    Vibration.vibrate(CONTINUOUS_PATTERN, true)
    salvo()
    salvoTimerRef.current = setInterval(salvo, SALVO_INTERVAL_MS)
    progress.value = withTiming(
      1,
      { duration: HOLD_MS * (1 - progress.value), easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(finishHold)()
      }
    )
  }

  const cancelHold = () => {
    stopSalvos()
    if (completedRef.current) return
    cancelAnimation(progress)
    progress.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) })
  }

  const fillStyle = useAnimatedStyle(() => ({ width: btnW * progress.value }))
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }))
  const ring1Style = useAnimatedStyle(() => ({
    opacity: (1 - ring1.value) * 0.65,
    transform: [{ scale: 1 + ring1.value * 0.35 }],
  }))
  const ring2Style = useAnimatedStyle(() => ({
    opacity: (1 - ring2.value) * 0.45,
    transform: [{ scale: 1 + ring2.value * 0.7 }],
  }))

  return (
    <Animated.View style={popStyle}>
      {/* Shockwave rings — expand off the button and dissolve */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, borderRadius: redesign.radius.pill, borderWidth: 2.5, borderColor: 'rgba(8,8,12,0.9)' }, ring1Style]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, borderRadius: redesign.radius.pill, borderWidth: 1.5, borderColor: 'rgba(8,8,12,0.7)' }, ring2Style]} />
      <Pressable
        onPressIn={startHold}
        onPressOut={cancelHold}
        onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold to send your application"
        style={{
          minHeight,
          borderRadius: redesign.radius.pill,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          justifyContent: 'center',
          backgroundColor: 'rgba(8,8,12,0.96)',
        }}
      >
        {/* Charge fill — a quiet, glossy charcoal that reads as depth rather than
            decoration, capped by one crisp white edge. The haptics carry all the
            drama; the surface stays composed and perfectly still. */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, fillStyle]}>
          {btnW > 0 ? (
            <LinearGradient
              colors={['#26262E', '#101015']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ width: btnW, height: '100%' }}
            />
          ) : null}
          <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.85)' }} />
        </Animated.View>

        {/* Completion flash — a white pop over the whole surface */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF' }, flashStyle]} />

        <View style={{ minHeight, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="gesture-tap-hold" size={18} color="#FFFFFF" />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={{ color: '#FFFFFF', fontFamily: typography.fontFamily, fontSize: 15, fontWeight: '700', textAlign: 'center' }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  )
}
