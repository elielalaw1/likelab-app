// Creator reputation — a behaviour-based standing computed CLIENT-SIDE from data
// already on the device. It is deliberately NON-monetary and NON-zero-sum: a
// creator earns standing by doing good work, and nobody's standing is taken away
// to grant it. Reputation is the engine that gives a creator a reason to open the
// app BETWEEN campaigns (build your standing), not just while a deliverable is due.
//
// ONE source of truth, three audiences (only the creator surface exists today):
//   • creator — sees their level + which signals lift/lower it (this file feeds it)
//   • brand   — a trust badge derived from `score` (future surface)
//   • admin   — the raw breakdown for vetting/approval automation (future, internal,
//               and intentionally not advertised to the creator)
//
// Today only ONE signal is wired to real data: how many deliverables the creator
// has COMPLETED (approved/published). The other three (on-time delivery,
// revision-free quality, reach) are designed into the model but marked
// `tracked: false` — they render as "coming soon" until the Lovable backend
// exposes them, at which point each becomes a one-line wiring change in
// computeReputation()'s input. Pure + render-free so it stays unit-testable.

import type { Deliverable } from '@/features/core/types'

export type ReputationSignalId = 'completed' | 'onTime' | 'quality' | 'reach'

export type ReputationSignal = {
  id: ReputationSignalId
  // Short English label shown next to the meter (matches the app's UI language).
  label: string
  // 0..1 meter strength, or null when the signal isn't tracked yet.
  value: number | null
  // Short human display, e.g. "12 jobs" or "Soon".
  display: string
  // false ⇒ not wired to real data yet → the UI renders it as a locked "coming
  // soon" row instead of a filled meter.
  tracked: boolean
}

export type Reputation = {
  // The single live driver — deliverables marked approved/published.
  completed: number
  // Composite 0..100 standing. Today a saturating function of `completed` only;
  // when more signals go live they fold in here without changing the shape.
  score: number
  // All four signals in display order; untracked ones are included so the UI can
  // show the full picture with the future ones greyed out.
  signals: ReputationSignal[]
}

export type ReputationInput = {
  // Completed deliverables (approved/published). The only required field today.
  completed: number
  // Reserved backend hooks — pass a finite 0..1 rate to flip the signal live.
  onTimeRate?: number | null // share of deliverables met on time
  qualityRate?: number | null // share that needed no revision
  reachScore?: number | null // normalised reach/engagement
}

// Completed deliverables at which the "Completed" meter reads full. Reaching this
// doesn't cap real progress (the tier ladder keeps climbing) — it's just where the
// reputation meter saturates so early jobs feel rewarding.
export const COMPLETED_FULL = 12

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

// A completed deliverable = work that's been approved or published. Centralised
// here so the tier ladder and reputation agree on what "done" means.
export function isCompletedDeliverable(d: Pick<Deliverable, 'status'>): boolean {
  return d.status === 'approved' || d.status === 'published'
}

export function countCompletedDeliverables(
  deliverables: ReadonlyArray<Pick<Deliverable, 'status'>> | null | undefined,
): number {
  if (!deliverables) return 0
  let n = 0
  for (const d of deliverables) if (isCompletedDeliverable(d)) n++
  return n
}

// Builds a signal that is live only when its backing rate is a finite number;
// otherwise it's a "coming soon" placeholder.
function rateSignal(id: ReputationSignalId, label: string, rate: number | null | undefined): ReputationSignal {
  const tracked = typeof rate === 'number' && Number.isFinite(rate)
  const value = tracked ? clamp01(rate as number) : null
  return {
    id,
    label,
    value,
    display: tracked ? `${Math.round((value as number) * 100)}%` : 'Soon',
    tracked,
  }
}

// Resolves a creator's reputation from their signals. Defensive against junk input.
export function computeReputation(input: ReputationInput): Reputation {
  const completed = Number.isFinite(input.completed) ? Math.max(0, Math.floor(input.completed)) : 0

  // Saturating 0..100 curve — fast early reward, diminishing returns. Replaceable
  // with a weighted blend once on-time/quality/reach come online.
  const score = Math.round((100 * completed) / (completed + COMPLETED_FULL))

  const signals: ReputationSignal[] = [
    {
      id: 'completed',
      label: 'Completed',
      value: clamp01(completed / COMPLETED_FULL),
      display: `${completed} ${completed === 1 ? 'job' : 'jobs'}`,
      tracked: true,
    },
    rateSignal('onTime', 'On time', input.onTimeRate),
    rateSignal('quality', 'Quality', input.qualityRate),
    rateSignal('reach', 'Reach', input.reachScore),
  ]

  return { completed, score, signals }
}
