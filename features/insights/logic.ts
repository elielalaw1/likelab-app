// Pure, render-free helpers for the insights dashboard. Kept separate from the
// React/SVG layer so the trend maths and chart geometry can be unit-tested
// without a renderer (see __tests__/logic.test.ts).

export type TrendDirection = 'up' | 'down' | 'flat'

export type Trend = {
  direction: TrendDirection
  // Signed percentage change vs the previous value, rounded. `null` when there
  // is no meaningful baseline (no previous campaign, or the previous value was
  // zero — a percentage against zero is undefined, not "infinite growth").
  percent: number | null
}

// Compares a current value to the previous one and classifies the movement.
// A small dead-zone (±0.5%) counts as flat so noise doesn't flip the arrow.
export function computeTrend(current: number, previous: number | null | undefined): Trend {
  if (previous == null || previous <= 0) {
    return { direction: current > 0 ? 'up' : 'flat', percent: null }
  }
  const change = ((current - previous) / previous) * 100
  const direction: TrendDirection = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat'
  return { direction, percent: Math.round(change) }
}

export type ChartPoint = { x: number; y: number; value: number }

export type ChartGeometry = {
  points: ChartPoint[]
  // Smooth open line through the points (Catmull-Rom → cubic bézier).
  linePath: string
  // The same curve closed down to the baseline, for a gradient area fill.
  areaPath: string
  // Approximate on-screen length of the line — used to drive the stroke
  // draw-on animation (strokeDasharray / strokeDashoffset).
  length: number
}

// Maps a numeric series to SVG coordinates and builds both a smooth line path
// and a closed area path. Y is anchored to [0, max] so heights read as absolute
// magnitude; a single point (or an all-equal series) renders as a flat line at
// mid-height rather than dividing by zero.
export function buildChart(values: number[], width: number, height: number, pad = 6): ChartGeometry {
  const inner = Math.max(1, height - pad * 2)
  const max = values.length ? Math.max(...values) : 0

  const points: ChartPoint[] = values.map((value, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = max > 0 ? pad + (1 - value / max) * inner : pad + inner / 2
    return { x, y, value }
  })

  if (points.length === 0) {
    return { points, linePath: '', areaPath: '', length: 0 }
  }

  if (points.length === 1) {
    const p = points[0]
    const line = `M ${pad} ${p.y} L ${width - pad} ${p.y}`
    const area = `${line} L ${width - pad} ${height} L ${pad} ${height} Z`
    return { points, linePath: line, areaPath: area, length: width - pad * 2 }
  }

  let line = `M ${round(points[0].x)} ${round(points[0].y)}`
  let length = 0
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    line += ` C ${round(cp1x)} ${round(cp1y)}, ${round(cp2x)} ${round(cp2y)}, ${round(p2.x)} ${round(p2.y)}`
    length += Math.hypot(p2.x - p1.x, p2.y - p1.y)
  }

  const first = points[0]
  const last = points[points.length - 1]
  const area = `${line} L ${round(last.x)} ${height} L ${round(first.x)} ${height} Z`

  return { points, linePath: line, areaPath: area, length }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
