export const colors = {
  background: 'hsl(0 0% 100%)',
  foreground: 'hsl(222.2 84% 4.9%)',
  primary: 'hsl(256 78% 38%)',
  primaryForeground: 'hsl(0 0% 100%)',
  secondary: 'hsl(210 40% 96.1%)',
  secondaryForeground: 'hsl(222.2 84% 4.9%)',
  muted: 'hsl(210 40% 96.1%)',
  mutedForeground: 'hsl(215.4 16.3% 46.9%)',
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
}

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
}

export const glass = {
  surface: 'rgba(255,255,255,0.85)',
  strong: 'rgba(255,255,255,0.92)',
  navbar: 'rgba(255,255,255,0.15)',
  border: 'rgba(3,7,18,0.05)',
  borderSoft: 'rgba(3,7,18,0.04)',
  highlight: 'rgba(255,255,255,0.6)',
}

export const gradients = {
  fluid: ['rgba(53,27,169,0.72)', 'rgba(46,227,241,0.58)', 'rgba(233,85,215,0.46)', 'rgba(255,213,0,0.34)'],
  button: ['#8B5CF6', '#6D28D9', '#351BA9'],
  glow: ['rgba(46,227,241,0.24)', 'rgba(233,85,215,0.18)', 'rgba(255,255,255,0.9)'],
}

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
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
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  floatingGate: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
}
