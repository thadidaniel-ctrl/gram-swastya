export const colors = {
  // Brand - Gram Swasthya Green
  brand: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
    950: '#0D3D11',
  },

  // Semantic - for status, feedback
  semantic: {
    success: {
      light: '#E8F5E9',
      main: '#2E7D32',
      dark: '#1B5E20',
      onMain: '#FFFFFF',
    },
    warning: {
      light: '#FFF8E1',
      main: '#F57C00',
      dark: '#E65100',
      onMain: '#FFFFFF',
    },
    error: {
      light: '#FDEDEC',
      main: '#D32F2F',
      dark: '#B71C1C',
      onMain: '#FFFFFF',
    },
    info: {
      light: '#E3F2FD',
      main: '#1976D2',
      dark: '#0D47A1',
      onMain: '#FFFFFF',
    },
  },

  // Neutral - for text, borders, backgrounds
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    950: '#171717',
  },

  // Surface - for cards, modals, overlays
  surface: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',
    tertiary: '#F5F5F5',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Medical category colors
  medical: {
    painkiller: '#F44336',
    antibiotic: '#2196F3',
    antacid: '#4CAF50',
    diabetes: '#E91E63',
    cholesterol: '#FF9800',
    bloodpressure: '#00BCD4',
    vitamin: '#8BC34A',
    coughcold: '#795548',
    allergy: '#9C27B0',
    mentalhealth: '#673AB7',
    skincare: '#EC407A',
    hormone: '#AB47BC',
    jointbone: '#5D4037',
  },

  // Background
  background: {
    primary: '#F1F8E9',
    secondary: '#FAFAFA',
    tertiary: '#FFFFFF',
  },

  // Text
  text: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#A3A3A3',
    inverse: '#FFFFFF',
    disabled: '#A3A3A3',
    link: '#2E7D32',
    linkHover: '#1B5E20',
  },

  // Border
  border: {
    light: '#E5E5E5',
    main: '#D4D4D4',
    dark: '#A3A3A3',
    focus: '#2E7D32',
    error: '#D32F2F',
  },

  // Status specific (for vitals, etc.)
  status: {
    normal: '#2E7D32',
    elevated: '#F57C00',
    high: '#D32F2F',
    critical: '#B71C1C',
    low: '#1976D2',
  },
};

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

export const typography = {
  fontFamily: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    devanagari: "'Noto Sans Devanagari', 'Inter', sans-serif",
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.02em',
    wider: '0.05em',
  },
};

export const borderRadius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
};

export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0,0,0,0.04)',
  sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  md: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
  '2xl': '0 25px 50px rgba(0,0,0,0.15)',
  inner: 'inset 0 2px 4px rgba(0,0,0,0.06)',
  focus: '0 0 0 3px rgba(46, 125, 50, 0.3)',
};

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
};

export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1700,
  emergency: 2000,
};

export const touchTarget = {
  minimum: '48px',
  comfortable: '56px',
};

export const animation = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

export const container = {
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1400px',
    full: '100%',
  },
  padding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  breakpoints,
  transitions,
  zIndex,
  touchTarget,
  animation,
  container,
};