// ===== THEME PALETTES =====
// COLORS is a mutable object — applyTheme() swaps values in place.
// Theme is applied at app startup (App.js) before screens load,
// so StyleSheet.create() picks up the right palette.

export const DARK_COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B85FF',
  secondary: '#FF6B6B',
  accent: '#00D2FF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  // ── Design system (2026 refresh) ─────────────────────────────
  // energy = effort/activity (rings, streaks, workout CTAs)
  energy: '#FF6B4A',
  energyLight: '#FFA24D',
  energySoft: 'rgba(255,107,74,0.16)',   // tinted chip/icon background
  // gold = earned moments only — PRs, badges, streak milestones, premium.
  // Used sparingly, which is what keeps it feeling premium.
  gold: '#E7C08B',
  goldSoft: 'rgba(231,192,139,0.15)',
  // active/live states, distinct from the brand hue
  active: '#2DE0B0',
  activeSoft: 'rgba(45,224,176,0.15)',
  brandSoft: 'rgba(108,99,255,0.18)',
  // a raised surface for cards that sit on top of cards
  cardElevated: '#2A2D45',
  hairline: 'rgba(255,255,255,0.07)',
  trackBg: 'rgba(255,255,255,0.10)',      // empty part of a progress bar/ring

  dark: '#151725',
  darkCard: '#222438',
  darkSurface: '#252A45',
  darkBorder: '#363A5C',

  // "white" doubles as primary content color — flips in light theme
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#C2C3DA',
  textMuted: '#9092B0',

  // Always-white: text/icons sitting on colored gradients & buttons
  onAccent: '#FFFFFF',

  gradient1: ['#6C63FF', '#00D2FF'],
  gradient2: ['#FF6B6B', '#FF8E53'],
  gradient3: ['#4CAF50', '#00D2FF'],
  gradient4: ['#6C63FF', '#FF6B6B'],
  gradientDark: ['#151725', '#222438'],
  gradientCard: ['#222438', '#252A45'],

  // Design-system gradients
  gradientBrand: ['#6C63FF', '#8B85FF'],        // primary buttons
  gradientEnergy: ['#FF6B4A', '#FFA24D'],       // activity ring, workout CTA
  gradientHero: ['#6C63FF', '#8B85FF', '#FF6B4A'], // signature brand→energy sweep
  gradientGold: ['#E7C08B', '#C79A5B'],         // achievements

  statusBar: 'light',
};

export const LIGHT_COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#7B73E8',
  secondary: '#F25555',
  accent: '#0099C2',
  success: '#3E9D43',
  warning: '#EF8A00',
  error: '#E53935',

  // ── Design system — deepened so each stays legible on white ──
  energy: '#EE5A2D',
  energyLight: '#F0912E',
  energySoft: 'rgba(238,90,45,0.12)',
  gold: '#A8792F',              // champagne reads as mud on white; deepen it
  goldSoft: 'rgba(168,121,47,0.13)',
  active: '#10B48C',
  activeSoft: 'rgba(16,180,140,0.13)',
  brandSoft: 'rgba(108,99,255,0.12)',
  cardElevated: '#FFFFFF',      // already white — the shadow does the lifting
  hairline: 'rgba(19,21,42,0.07)',
  trackBg: 'rgba(19,21,42,0.10)',

  // Surfaces — light
  dark: '#F4F5FB',        // app background
  darkCard: '#FFFFFF',    // cards
  darkSurface: '#EDEFF8', // inputs/inner surfaces
  darkBorder: '#E0E2F0',  // borders

  // Content — dark text on light surfaces
  white: '#13152A',
  textPrimary: '#13152A',
  textSecondary: '#32345C',
  textMuted: '#5D5F85',

  // Always-white: text/icons on colored gradients & buttons
  onAccent: '#FFFFFF',

  gradient1: ['#6C63FF', '#00B8E0'],
  gradient2: ['#FF6B6B', '#FF8E53'],
  gradient3: ['#4CAF50', '#00B8E0'],
  gradient4: ['#6C63FF', '#FF6B6B'],
  gradientDark: ['#F4F5FB', '#FFFFFF'],
  gradientCard: ['#FFFFFF', '#EDEFF8'],

  // Design-system gradients (white text sits on these, so they stay saturated)
  gradientBrand: ['#6C63FF', '#8B85FF'],
  gradientEnergy: ['#F2542D', '#F5922E'],
  gradientHero: ['#6C63FF', '#8B85FF', '#F2542D'],
  gradientGold: ['#C79A5B', '#A8792F'],

  statusBar: 'dark',
};

// Default theme = LIGHT
export const COLORS = { ...LIGHT_COLORS };

export const applyTheme = (mode) => {
  Object.assign(COLORS, mode === 'dark' ? DARK_COLORS : LIGHT_COLORS);
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  fontXs: 10,
  fontSm: 12,
  fontMd: 14,
  fontLg: 16,
  fontXl: 20,
  fontXxl: 24,
  fontTitle: 28,
  fontHero: 36,

  radius: 12,
  radiusSm: 8,
  radiusLg: 20,
  radiusXl: 28,
  radiusFull: 100,
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semiBold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extraBold: { fontWeight: '800' },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 4.65,
    elevation: 6,
  },
  glow: (color = '#6C63FF') => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  }),
};
