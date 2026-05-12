type Listener = () => void

const listeners = new Map<string, Set<Listener>>()

export const scrollEvents = {
  emit(event: string) {
    listeners.get(event)?.forEach((fn) => fn())
  },
  on(event: string, fn: Listener): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(fn)
    return () => { listeners.get(event)?.delete(fn) }
  },
}
