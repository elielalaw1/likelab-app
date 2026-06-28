import { buildChart, computeTrend } from '@/features/insights/logic'

describe('computeTrend', () => {
  it('reports upward movement with a rounded percentage', () => {
    const t = computeTrend(134, 100)
    expect(t.direction).toBe('up')
    expect(t.percent).toBe(34)
  })

  it('reports downward movement', () => {
    const t = computeTrend(80, 100)
    expect(t.direction).toBe('down')
    expect(t.percent).toBe(-20)
  })

  it('treats a tiny change as flat (dead-zone)', () => {
    expect(computeTrend(100, 100).direction).toBe('flat')
    expect(computeTrend(100, 100).percent).toBe(0)
  })

  it('has no baseline when there is no previous campaign', () => {
    const t = computeTrend(500, null)
    expect(t.percent).toBeNull()
    expect(t.direction).toBe('up')
  })

  it('has no baseline when the previous value was zero (avoids divide-by-zero)', () => {
    const t = computeTrend(500, 0)
    expect(t.percent).toBeNull()
  })

  it('is flat with no baseline and no current value', () => {
    expect(computeTrend(0, 0)).toEqual({ direction: 'flat', percent: null })
  })
})

describe('buildChart', () => {
  it('returns empty geometry for an empty series', () => {
    const g = buildChart([], 300, 100)
    expect(g.points).toHaveLength(0)
    expect(g.linePath).toBe('')
    expect(g.areaPath).toBe('')
  })

  it('draws a flat mid-line for a single point', () => {
    const g = buildChart([500], 300, 100)
    expect(g.points).toHaveLength(1)
    expect(g.linePath.startsWith('M')).toBe(true)
    // Area path closes back to the baseline.
    expect(g.areaPath.trim().endsWith('Z')).toBe(true)
  })

  it('maps the max value to the top and zero to the baseline', () => {
    const pad = 6
    const height = 100
    const g = buildChart([0, 100], 300, height, pad)
    const [low, high] = g.points
    expect(high.y).toBeCloseTo(pad) // max → top
    expect(low.y).toBeCloseTo(pad + (height - pad * 2)) // zero → bottom of plot
  })

  it('spreads points evenly across the width and starts the path at the first point', () => {
    const g = buildChart([10, 20, 30], 300, 100, 6)
    expect(g.points[0].x).toBeCloseTo(6)
    expect(g.points[2].x).toBeCloseTo(294)
    expect(g.linePath.startsWith('M 6')).toBe(true)
    expect(g.areaPath.trim().endsWith('Z')).toBe(true)
    expect(g.length).toBeGreaterThan(0)
  })

  it('does not divide by zero for an all-equal series', () => {
    const g = buildChart([50, 50, 50], 300, 100)
    expect(g.points.every((p) => Number.isFinite(p.y))).toBe(true)
  })

  it('over-estimates path length so the draw-on animation covers the full curve', () => {
    const g = buildChart([10, 90, 20, 80], 300, 100, 6)
    const first = g.points[0]
    const last = g.points[g.points.length - 1]
    const straightLine = Math.hypot(last.x - first.x, last.y - first.y)
    // A curved cubic path is always longer than the endpoint chord — the padded
    // length must cover it or the stroke stops short of the newest point.
    expect(g.length).toBeGreaterThan(straightLine)
  })
})
