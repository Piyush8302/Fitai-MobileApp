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
