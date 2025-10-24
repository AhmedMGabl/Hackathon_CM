/**
 * MetricWave Design Tokens
 * Professional, WCAG-compliant color palette and typography system
 */

export const tokens = {
  colors: {
    // Brand (Professional blue - less saturated)
    primary: {
      50: '#f0f4f8',
      100: '#d9e2ec',
      200: '#bcccdc',
      300: '#9fb3c8',
      400: '#829ab1',
      500: '#627d98', // Professional slate blue
      600: '#486581', // Primary brand color (less saturated)
      700: '#334e68',
      800: '#243b53',
      900: '#102a43',
    },

    // Status colors
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a', // Success green
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Warning amber
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626', // Danger red
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Neutrals (Slate)
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },

    // Professional dark theme (subtle, not harsh black)
    surface: {
      dark: '#1a1d23',      // Soft dark blue-gray (main background)
      darker: '#12141a',    // Deeper shade
      card: '#22262e',      // Card background with subtle contrast
      elevated: '#2a2f38',  // Elevated elements (modals, dropdowns)
    },
  },

  // Typography scale
  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },

    lineHeight: {
      tight: '1.2',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.6',
      loose: '2',
    },

    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },

    fontFamily: {
      sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
      mono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
    },
  },

  // Border radii
  radii: {
    none: '0',
    sm: '4px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    card: '0 4px 12px rgba(0, 0, 0, 0.08)',
    elevated: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },

  // Spacing scale
  spacing: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
  },
} as const;

// Status color helpers
export const getStatusColor = (status: 'ABOVE' | 'WARNING' | 'BELOW') => {
  switch (status) {
    case 'ABOVE':
      return tokens.colors.success[600];
    case 'WARNING':
      return tokens.colors.warning[500];
    case 'BELOW':
      return tokens.colors.danger[600];
    default:
      return tokens.colors.neutral[400];
  }
};

// Chart theme configuration for Recharts
export const chartTheme = {
  colors: {
    primary: tokens.colors.primary[600],
    success: tokens.colors.success[600],
    warning: tokens.colors.warning[500],
    danger: tokens.colors.danger[600],
    gridline: 'rgba(148, 163, 184, 0.1)',
    text: tokens.colors.neutral[300],
    axis: tokens.colors.neutral[400],
  },
  fontSize: 12,
  fontFamily: tokens.typography.fontFamily.sans,
  gridStrokeDasharray: '3 3',
};

// Type exports
export type TokenColor = keyof typeof tokens.colors;
export type TokenRadius = keyof typeof tokens.radii;
export type TokenShadow = keyof typeof tokens.shadows;
