import { ReactNode, useState } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated'

// React Native port of React Bits' <ElectricBorder /> (canvas/CSS original inspired
// by @BalintFerenczy, https://codepen.io/BalintFerenczy/pen/KwdoyEN). The same
// octaved value noise displaces points sampled along the card's rounded-rect
// perimeter; instead of a 2D canvas we rebuild an SVG path per frame in a Reanimated
// worklet, so the jitter runs on the UI thread. The CSS blur glows are approximated
// with a static soft border ring + a wide low-opacity stroke under the crisp one.
// The original's tinted background glow is intentionally NOT ported — it dirties
// the app's white pages.

// The jagged line needs room to dance outside the frame.
const PAD = 20
// Matches the original's displacement=60; chaos scales it.
const DISPLACEMENT = 60

function fract(x: number): number {
  'worklet'
  return x - Math.floor(x)
}

function rand1(x: number): number {
  'worklet'
  return fract(Math.sin(x * 12.9898) * 43758.5453)
}

function noise2D(x: number, y: number): number {
  'worklet'
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j
  const a = rand1(i + j * 57)
  const b = rand1(i + 1 + j * 57)
  const c = rand1(i + (j + 1) * 57)
  const d = rand1(i + 1 + (j + 1) * 57)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
}

// 5 octaves (the original runs 10 — halved for phone-budget) with the original's
// lacunarity 1.6 / gain 0.7 / frequency 10 / baseFlatness 0 (octave 0 contributes 0).
function octavedNoise(x: number, time: number, seed: number, amplitude: number): number {
  'worklet'
  let y = 0
  let amp = amplitude
  let freq = 10
  for (let k = 0; k < 5; k++) {
    if (k > 0) y += amp * noise2D(freq * x + seed * 100, time * freq * 0.3)
    freq *= 1.6
    amp *= 0.7
  }
  return y
}

function cornerPoint(cx: number, cy: number, r: number, startAngle: number, arc: number, progress: number): { x: number; y: number } {
  'worklet'
  const angle = startAngle + progress * arc
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

// Point at parameter t (0..1) along a rounded rect's perimeter — direct port.
function roundedRectPoint(t: number, left: number, top: number, w: number, h: number, r: number): { x: number; y: number } {
  'worklet'
  const sw = w - 2 * r
  const sh = h - 2 * r
  const arc = (Math.PI * r) / 2
  const total = 2 * sw + 2 * sh + 4 * arc
  const dist = t * total
  let acc = 0
  if (dist <= acc + sw) return { x: left + r + (dist - acc), y: top }
  acc += sw
  if (dist <= acc + arc) return cornerPoint(left + w - r, top + r, r, -Math.PI / 2, Math.PI / 2, (dist - acc) / arc)
  acc += arc
  if (dist <= acc + sh) return { x: left + w, y: top + r + (dist - acc) }
  acc += sh
  if (dist <= acc + arc) return cornerPoint(left + w - r, top + h - r, r, 0, Math.PI / 2, (dist - acc) / arc)
  acc += arc
  if (dist <= acc + sw) return { x: left + w - r - (dist - acc), y: top + h }
  acc += sw
  if (dist <= acc + arc) return cornerPoint(left + r, top + h - r, r, Math.PI / 2, Math.PI / 2, (dist - acc) / arc)
  acc += arc
  if (dist <= acc + sh) return { x: left, y: top + h - r - (dist - acc) }
  acc += sh
  return cornerPoint(left + r, top + r, r, Math.PI, Math.PI / 2, (dist - acc) / arc)
}

function electricPath(w: number, h: number, radius: number, time: number, chaos: number): string {
  'worklet'
  const maxR = Math.min(w, h) / 2
  const r = Math.min(radius, maxR)
  const perimeter = 2 * (w + h - 4 * r) + 2 * Math.PI * r
  // The original samples every 2px; every 5px (capped) keeps phones comfortable.
  const n = Math.min(220, Math.max(48, Math.floor(perimeter / 5)))
  let d = ''
  for (let i = 0; i <= n; i++) {
    const p = i / n
    const pt = roundedRectPoint(p, PAD, PAD, w, h, r)
    const x = pt.x + octavedNoise(p * 8, time, 0, chaos) * DISPLACEMENT
    const y = pt.y + octavedNoise(p * 8, time, 1, chaos) * DISPLACEMENT
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }
  return d + 'Z'
}

const AnimatedPath = Animated.createAnimatedComponent(Path)

export function ElectricBorder({
  children,
  color = '#7C5CFF',
  speed = 1,
  chaos = 0.05,
  radius = 24,
}: {
  children: ReactNode
  color?: string
  speed?: number
  chaos?: number
  radius?: number
}) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const time = useSharedValue(0)

  // Quantize to ~30fps — halves the path rebuilds with no visible loss of chaos.
  useFrameCallback((frame) => {
    const ts = frame.timeSinceFirstFrame ?? 0
    time.value = (Math.floor(ts / 33) * 33 * speed) / 1000
  })

  const d = useDerivedValue(() =>
    size.w > 0 ? electricPath(size.w, size.h, radius, time.value, chaos) : ''
  )
  const glowProps = useAnimatedProps(() => ({ d: d.value }))
  const coreProps = useAnimatedProps(() => ({ d: d.value }))

  return (
    <View
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ borderRadius: radius }}
    >
      {children}
      {/* Static soft rings — stand-ins for the CSS blurred border glows */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, borderRadius: radius, borderWidth: 2, borderColor: color, opacity: 0.5 }} />
      <View pointerEvents="none" style={{ position: 'absolute', inset: -2, borderRadius: radius + 2, borderWidth: 2, borderColor: color, opacity: 0.2 }} />
      {/* The living, jittering line. Wrapped in a plain View because pointerEvents
          set directly on react-native-svg's Svg is not reliably honored — the
          full-card overlay would swallow every tap on the campaign. */}
      {size.w > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: -PAD, top: -PAD, width: size.w + PAD * 2, height: size.h + PAD * 2 }}>
          <Svg width={size.w + PAD * 2} height={size.h + PAD * 2}>
            <AnimatedPath animatedProps={glowProps} stroke={color} strokeWidth={4.5} strokeOpacity={0.3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <AnimatedPath animatedProps={coreProps} stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
      ) : null}
    </View>
  )
}
