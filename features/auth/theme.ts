import { colors, glass, gradients, palette, radii, shadows, typography } from '@/features/core/theme'

export const authColors = {
  bg: palette.bg,
  card: glass.surface,
  border: glass.border,
  borderSoft: glass.borderSoft,
  text: palette.text,
  muted: palette.textMuted,
  accent: colors.primary,
  accentBright: colors.likelabPurple,
  accentSoft: 'rgba(124,58,237,0.24)',
  buttonBg: 'rgba(255,255,255,0.82)',
  pillBg: 'rgba(255,255,255,0.9)',
  glassStrong: glass.strong,
  fluidGradient: gradients.fluid,
  buttonGradient: gradients.button,
  radii,
  shadows,
  typography,
}
