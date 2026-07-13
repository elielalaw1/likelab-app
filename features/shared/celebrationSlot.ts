import { useEffect } from 'react'
import { useSyncExternalStore } from 'react'

// A single-slot FIFO so at most one celebration/announcement Modal is presented at a
// time. iOS only presents ONE Modal from the root at once; without coordination two
// hosts that fire on the SAME event — e.g. a brand approving work both makes the video
// live (LiveCelebrationHost) AND bumps the creator's level (LevelUpHost) — each set
// visible=true and iOS silently drops one, leaving it stuck visible-but-unpresented
// until an unrelated re-render or restart. Hosts request the slot while they have
// something to show and render their Modal only while they HOLD it (the head of the
// queue); releasing on close presents the next in line.

let queue: string[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getHead(): string | null {
  return queue[0] ?? null
}

function request(id: string) {
  if (!queue.includes(id)) {
    queue.push(id)
    emit()
  }
}

function release(id: string) {
  if (queue.includes(id)) {
    queue = queue.filter((q) => q !== id)
    emit()
  }
}

// Returns true when `id` currently holds the single presentation slot. Pass `want=true`
// while this host has something to show; the hook enqueues/dequeues for you and always
// releases on unmount so a crash/navigation can't wedge the queue. Enqueue order follows
// component mount order, so the slot is handed out deterministically.
export function useCelebrationSlot(id: string, want: boolean): boolean {
  const head = useSyncExternalStore(subscribe, getHead, getHead)
  useEffect(() => {
    if (want) request(id)
    else release(id)
  }, [id, want])
  useEffect(() => () => release(id), [id])
  return head === id
}
