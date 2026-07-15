import * as Haptics from 'expo-haptics'

export const haptic = {
  selection: () => Haptics.selectionAsync().catch(() => {}),
  light:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  heavy:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  success:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning:   () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
}

// Rapid-fire heavy impacts for a fixed duration — used by the logo-spam easter
// egg. Returns a stop function so a caller can cut it short (e.g. on unmount).
export function startHapticRampage(durationMs: number): () => void {
  const interval = setInterval(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
  }, 60)
  const timeout = setTimeout(() => clearInterval(interval), durationMs)
  return () => {
    clearInterval(interval)
    clearTimeout(timeout)
  }
}
