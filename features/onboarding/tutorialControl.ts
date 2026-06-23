// Tiny pub/sub so the tutorial (mounted in the tabs layout) can be force-replayed
// from anywhere (e.g. a "Replay tutorial" button in Settings).
type Listener = () => void

const listeners = new Set<Listener>()

export function replayTutorial() {
  listeners.forEach((l) => l())
}

export function onReplayTutorial(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
