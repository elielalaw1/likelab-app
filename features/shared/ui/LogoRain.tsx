import { useEffect, useMemo, useRef } from 'react'
import { Dimensions, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

const topLogo = require('@/assets/images/likelablogonew.png')

type AvoidCenter = { x: number; y: number; radius: number } | null | undefined

function FallingLogo({
  screenWidth,
  screenHeight,
  loopDurationMs,
  avoidCenter,
  onTouch,
}: {
  screenWidth: number
  screenHeight: number
  loopDurationMs: number
  avoidCenter: AvoidCenter
  onTouch?: () => void
}) {
  const baseX = useMemo(() => Math.random() * (screenWidth - 36), [screenWidth])
  const size = useMemo(() => 20 + Math.random() * 22, [])
  const fallDuration = useMemo(() => 1500 + Math.random() * 1300, [])
  const delay = useMemo(() => Math.random() * loopDurationMs, [loopDurationMs])
  const spin = useMemo(() => (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360), [])

  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: fallDuration, easing: Easing.linear }), -1, false)
    )
  }, [delay, fallDuration, progress])

  // Tracks whether this drop is currently inside the "touching" ring around
  // avoidCenter, so onTouch fires once on entry rather than every frame while it
  // lingers there.
  const isTouching = useSharedValue(false)

  // Pushes the drop's horizontal lane away from `avoidCenter` (e.g. the enlarged
  // profile photo) as it falls past — a soft radial repulsion, not real physics —
  // and fires a haptic buzz the instant it makes "contact" with it.
  const derivedX = useDerivedValue(() => {
    if (!avoidCenter) {
      isTouching.value = false
      return baseX
    }
    const currentY = -60 + progress.value * (screenHeight + 120)
    const dx = baseX - avoidCenter.x
    const dy = currentY - avoidCenter.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const influenceRadius = avoidCenter.radius + 90
    const contactRadius = avoidCenter.radius + 18

    const touchingNow = dist <= contactRadius
    if (touchingNow && !isTouching.value && onTouch) {
      runOnJS(onTouch)()
    }
    isTouching.value = touchingNow

    if (dist === 0 || dist > influenceRadius) return baseX
    const push = (influenceRadius - dist) * 1.6
    const angle = Math.atan2(dy, dx)
    return baseX + Math.cos(angle) * push
  }, [avoidCenter, baseX, screenHeight, onTouch])

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: derivedX.value,
    top: -60,
    width: size,
    height: size,
    opacity: 0.92,
    transform: [
      { translateY: progress.value * (screenHeight + 120) },
      { rotate: `${progress.value * spin}deg` },
    ],
  }))

  return <Animated.Image source={topLogo} resizeMode="contain" style={style} />
}

// Full-screen falling-logo overlay. `avoidCenter` (screen coordinates + radius) makes
// drops swerve around a focal point, e.g. an enlarged profile photo. Always
// `pointerEvents="none"` so it never blocks touches on whatever it's layered over.
export function LogoRain({
  active,
  density = 40,
  loopDurationMs = 5000,
  avoidCenter,
  onTouch,
}: {
  active: boolean
  density?: number
  loopDurationMs?: number
  avoidCenter?: AvoidCenter
  /** Called (JS thread) every time a drop makes contact with avoidCenter. */
  onTouch?: () => void
}) {
  const { width, height } = Dimensions.get('window')

  // Every drop shares this gate — with dozens of drops able to graze avoidCenter
  // within the same few frames, an unthrottled onTouch would fire (and cross the
  // JS/native bridge for a haptic) far more often than a human can feel, which is
  // what made the device stutter. One buzz per ~45ms reads as continuous contact
  // without flooding the bridge.
  const lastTouchAtRef = useRef(0)
  const throttledOnTouch = useMemo(() => {
    if (!onTouch) return undefined
    return () => {
      const now = Date.now()
      if (now - lastTouchAtRef.current < 45) return
      lastTouchAtRef.current = now
      onTouch()
    }
  }, [onTouch])

  if (!active) return null

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
      {Array.from({ length: density }, (_, i) => (
        <FallingLogo
          key={i}
          screenWidth={width}
          screenHeight={height}
          loopDurationMs={loopDurationMs}
          avoidCenter={avoidCenter}
          onTouch={throttledOnTouch}
        />
      ))}
    </Animated.View>
  )
}
