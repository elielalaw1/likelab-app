import { router } from 'expo-router'

// Guards against double navigation from a rapid double-tap on a card/row: a second
// push to the SAME target within a short window is ignored, so two identical detail
// screens don't stack (the user would otherwise have to tap Back twice). Navigating
// to a DIFFERENT target is never blocked.
let lastHref: string | null = null
let lastNavAt = 0

export function navigateOnce(href: Parameters<typeof router.push>[0]) {
  const key = typeof href === 'string' ? href : JSON.stringify(href)
  const now = Date.now()
  if (key === lastHref && now - lastNavAt < 900) return
  lastHref = key
  lastNavAt = now
  router.push(href)
}
