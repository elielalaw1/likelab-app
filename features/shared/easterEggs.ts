type Listener = () => void

const listeners = new Set<Listener>()

// Mounted once at the app root (LogoRainEasterEgg in app/_layout.tsx); triggered
// from wherever the logo lives (PersistentTabHeader) on a rapid-tap spam.
export const logoRainEasterEgg = {
  trigger() {
    listeners.forEach((fn) => fn())
  },
  onTrigger(fn: Listener): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
