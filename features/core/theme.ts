// ─── Light colours ────────────────────────────────────────────────────────────
export const colors = {
  background: 'hsl(0 0% 100%)',
  foreground: 'hsl(240 30% 6%)',
  primary: 'hsl(256 78% 38%)',
  primaryForeground: 'hsl(0 0% 100%)',
  secondary: 'hsl(210 40% 96.1%)',
  secondaryForeground: 'hsl(222.2 84% 4.9%)',
  muted: 'hsl(210 40% 96.1%)',
  mutedForeground: 'hsl(232 18% 32%)',
  accent: 'hsl(263 85% 58%)',
  accentForeground: 'hsl(0 0% 100%)',
  destructive: 'hsl(0 84.2% 60.2%)',
  destructiveForeground: 'hsl(0 0% 100%)',
  border: 'hsl(214.3 31.8% 91.4%)',
  input: 'hsl(214.3 31.8% 91.4%)',
  ring: 'hsl(256 78% 38%)',
  card: 'hsl(0 0% 100%)',
  cardForeground: 'hsl(222.2 84% 4.9%)',
  likelabIndigo: 'hsl(256 78% 38%)',
  likelabPurple: 'hsl(263 85% 58%)',
  likelabCyan: 'hsl(185 88% 55%)',
  likelabMagenta: 'hsl(305 78% 62%)',
  likelabYellow: 'hsl(42 92% 62%)',
  likelabLavender: 'hsl(232 88% 89%)',
}

export const palette = {
  bg: colors.background,
  card: colors.card,
  cardSoft: 'rgba(255,255,255,0.85)',
  cardGlass: 'rgba(255,255,255,0.85)',
  glassStrong: 'rgba(255,255,255,0.92)',
  text: colors.foreground,
  textMuted: colors.mutedForeground,
  line: colors.border,
  primary: colors.primary,
  successBg: 'hsl(145 50% 92%)',
  successText: 'hsl(145 60% 32%)',
  warningBg: '#FEF3C7',
  warningText: '#B45309',
  dangerBg: '#FEE2E2',
  dangerText: 'hsl(0 84.2% 60.2%)',
  neutralBg: colors.muted,
  neutralText: colors.mutedForeground,
  // structural tokens used by components
  cardBg: 'rgba(255,255,255,0.8)',
  inputBg: '#ffffff',
  borderColor: 'rgba(234,236,239,0.9)',
  borderSoft: 'rgba(234,236,239,0.5)',
  sectionBg: 'rgba(255,255,255,0.92)',
  tabBarBg: 'rgba(248,250,252,0.56)',
  tabBarBorder: 'rgba(15,23,42,0.08)',
  overlayBg: 'rgba(10,15,30,0.3)',
}

export type AppColors = typeof colors
export type AppPalette = typeof palette

// ─── Static tokens (scheme-independent) ──────────────────────────────────────
export const radii = {
  button: 14,
  input: 12,
  card: 20,
  feature: 28,
  navbar: 32,
  sidebarNav: 14,
  tabContainer: 20,
  tabButton: 16,
  full: 999,
}

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  page: 16,
  card: 20,
  block: 20,
}

export const typography = {
  fontFamily: 'Montserrat',
  fontFamilyLight: 'Montserrat-Light',
  lineHeights: {
    heading: 1.12,
    body: 1.45,
  },
  sizes: {
    pageTitle: 24,
    subtitle: 14,
    cardLabel: 11,
    statValue: 24,
    sidebarItem: 13,
    bottomNavLabel: 10,
    badge: 12,
    formLabel: 11,
    button: 14,
    sectionHeader: 11,
    body: 14,
  },
  // ─── Premium display tiers (paired light/bold for weight-contrast hierarchy)
  display: {
    fontFamily: 'Montserrat-Light',
    fontSize: 46,
    fontWeight: '300' as const,
    lineHeight: 50,
    letterSpacing: -2,
  },
  displayBold: {
    fontFamily: 'Montserrat',
    fontSize: 46,
    fontWeight: '800' as const,
    lineHeight: 50,
    letterSpacing: -2,
  },
  hero: {
    fontFamily: 'Montserrat-Light',
    fontSize: 34,
    fontWeight: '300' as const,
    lineHeight: 38,
    letterSpacing: -1,
  },
  heroBold: {
    fontFamily: 'Montserrat',
    fontSize: 34,
    fontWeight: '800' as const,
    lineHeight: 38,
    letterSpacing: -1,
  },
}

export const glass = {
  surface: 'rgba(255,255,255,0.85)',
  strong: 'rgba(255,255,255,0.92)',
  navbar: 'rgba(255,255,255,0.15)',
  border: 'rgba(3,7,18,0.05)',
  borderSoft: 'rgba(3,7,18,0.04)',
  highlight: 'rgba(255,255,255,0.6)',
  // ─── Liquid Glass tokens (iOS 26-inspired)
  cardBackground: 'rgba(255,255,255,0.62)',
  surfaceBackground: 'rgba(255,255,255,0.45)',
  liquidBorder: 'rgba(255,255,255,0.8)',
  borderStrong: 'rgba(255,255,255,0.95)',
  darkButton: 'rgba(13,13,26,0.82)',
  darkText: '#0d0d1a',
  blurIntensityCard: 55,
  blurIntensityTabBar: 80,
  blurIntensitySubtle: 40,
  // ─── v1.3 tightened glass tokens (Wallpaper + GlassCard system)
  cardBg:           'rgba(255,255,255,0.82)',
  cardBgStrong:     'rgba(255,255,255,0.88)',
  cardBorder:       'rgba(255,255,255,1)',
  cardBorderStrong: 'rgba(255,255,255,1)',
  darkBg:           'rgba(8,8,12,0.96)',
  darkBorder:       'rgba(255,255,255,0.14)',
  tabBarBg:         'rgba(255,255,255,0.70)',
  tabBarBorder:     'rgba(255,255,255,1)',
  blurCard:         28,
  blurButton:       12,
  blurTabBar:       50,
  // ─── v1.4 purple-tinted shadow tokens
  shadowColor:      '#6040A0',
  shadowOpacity:    0.13,
  shadowRadius:     28,
  shadowOffsetY:    10,
  shadowColorSm:    '#6040A0',
  shadowOpacitySm:  0.10,
  shadowRadiusSm:   16,
  shadowOffsetYSm:  6,
}

export const screenGradients = {
  discover:     { colors: ['#f0ecff', '#e8f4ff', '#f5f0ff'] as const, start: { x: 0.15, y: 0 } as const, end: { x: 0.85, y: 1 } as const },
  profile:      { colors: ['#fff5f0', '#f0f5ff', '#f5f0ff'] as const, start: { x: 0.25, y: 0 } as const, end: { x: 0.75, y: 1 } as const },
  deliverables: { colors: ['#f0f8ff', '#f5f0ff', '#e8f5f0'] as const, start: { x: 0.2, y: 0 } as const, end: { x: 0.8, y: 1 } as const },
}

export const gradients = {
  fluid: ['rgba(53,27,169,0.72)', 'rgba(46,227,241,0.58)', 'rgba(233,85,215,0.46)', 'rgba(255,213,0,0.34)'],
  button: ['#8B5CF6', '#6D28D9', '#351BA9'],
  glow: ['rgba(46,227,241,0.24)', 'rgba(233,85,215,0.18)', 'rgba(255,255,255,0.9)'],
}

// ─── Redesign token layer (premium / Apple-Revolut-grade) ────────────────────
// Additive layer for the app redesign. Extends — never overrides — the tokens
// above. On conflict, prefer the existing token and treat these as design intent.
export const redesign = {
  color: {
    bg: '#F4F3F0',            // warm off-white screen background
    ink: '#0B0B0F',           // near-black primary text / dark surface
    muted: '#6B6B76',         // secondary copy
    faint: '#9A9AA4',         // uppercase micro-labels
    hairline: 'rgba(11,11,15,0.05)',
    hairlineStrong: 'rgba(11,11,15,0.08)',
    card: '#FFFFFF',
    darkScreen: '#0E0E13',    // dark hero cards / wallet screen
    darkCard: '#141420',
    darkCardAlt: '#15151F',
    purple: '#6350B8',
    magenta: '#F25CC1',
    cyan: '#1FC8E8',
    yellow: '#F5C73C',
    successText: '#0E9F6E',
    successBg: 'rgba(16,185,129,0.12)',
    reviewText: '#6350B8',
    reviewBg: 'rgba(99,80,184,0.10)',
    warningText: '#B45309',
    warningBg: '#FFF7E8',
    payoutGreen: '#3BD68A',   // paid amount on dark
    gold: '#FFD66B',          // rank #1 / processing on dark
  },
  // Signature gradients — holographic used as accent only (borders, logo), never full-screen.
  gradient: {
    holographic: ['#F5C73C', '#F25CC1', '#6350B8', '#1FC8E8'] as const,
    holographicLocations: [0, 0.38, 0.68, 1] as const,
    accent: ['#6350B8', '#1FC8E8'] as const,       // progress bars
    avatarRing: ['#6350B8', '#F25CC1', '#1FC8E8'] as const,
  },
  radius: {
    card: 26,
    cardSm: 24,
    cell: 16,
    pill: 999,
    segment: 16,
    segmentActive: 12,
  },
  shadow: {
    card: {
      shadowColor: '#0B0B0F',
      shadowOpacity: 0.10,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 14 },
      elevation: 8,
    },
    cta: {
      shadowColor: '#0B0B0F',
      shadowOpacity: 0.35,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 20 },
      elevation: 16,
    },
    stickyUp: {
      shadowColor: '#0B0B0F',
      shadowOpacity: 0.10,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: -8 },
      elevation: 24,
    },
  },
}

export const shadows = {
  card: {
    shadowColor: '#3A1F7A',
    shadowOpacity: 0.22,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  navbar: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  hero: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  deliverable: {
    shadowColor: '#3A1F7A',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  floatingGate: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
}
