// Tiny pub/sub so the tutorial (or a Settings "replay") can kick off the profile
// coachmark tour after navigating to the profile tab. Buffers one pending start
// so a signal fired before the profile screen mounts isn't lost.
type Listener = () => void

let listener: Listener | null = null
let pending = false

export function startProfileTour(): void {
  if (listener) listener()
  else pending = true
}

export function onStartProfileTour(cb: Listener): () => void {
  listener = cb
  if (pending) {
    pending = false
    cb()
  }
  return () => {
    if (listener === cb) listener = null
  }
}
