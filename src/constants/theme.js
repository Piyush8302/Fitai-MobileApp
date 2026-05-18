export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  primaryLight: '#8B85FF',
  secondary: '#FF6B6B',
  accent: '#00D2FF',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  dark: '#0D0D1A',
  darkCard: '#1A1A2E',
  darkSurface: '#16213E',
  darkBorder: '#2A2A4A',

  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0CC',
  textMuted: '#6B6B8D',

  gradient1: ['#6C63FF', '#00D2FF'],
  gradient2: ['#FF6B6B', '#FF8E53'],
  gradient3: ['#4CAF50', '#00D2FF'],
  gradient4: ['#6C63FF', '#FF6B6B'],
  gradientDark: ['#0D0D1A', '#1A1A2E'],
  gradientCard: ['#1A1A2E', '#16213E'],
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  glow: (color = '#6C63FF') => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};
