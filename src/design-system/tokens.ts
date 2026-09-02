/**
 * WedFlow Design System - Central Design Tokens
 * 
 * Foundational tokens for colors, typography, spacing, breakpoints,
 * radii, shadows, and touch targets across the entire WedFlow product.
 */

export const tokens = {
  // Brand Color Palette (Strict Ratio: 70% Ivory, 20% Charcoal, 8% Burgundy, 2% Gold)
  colors: {
    burgundy: {
      50: '#FAF3F4',
      100: '#F3E4E6',
      200: '#E6C5C9',
      300: '#D39CA3',
      400: '#B86E78',
      500: '#8F444D',
      600: '#71343B', // Primary Brand
      700: '#5A292F',
      800: '#451F23',
      900: '#301518',
      DEFAULT: '#71343B',
    },
    ivory: {
      50: '#FDFCF9',
      100: '#FAF8F3', // Primary Warm Background
      200: '#F4EFE6',
      300: '#EAE2D5',
      DEFAULT: '#FAF8F3',
    },
    charcoal: {
      50: '#F7F6F5',
      100: '#E6E4E2',
      200: '#C7C4C0',
      300: '#9F9A95',
      400: '#6E6964',
      500: '#4A4541',
      600: '#282625', // Primary Text
      700: '#1E1D1C',
      800: '#161514',
      900: '#0D0D0C',
      DEFAULT: '#282625',
    },
    beige: {
      50: '#F8F5F0',
      100: '#F2ECE2',
      200: '#E9E1D6', // Subtle Borders & Dividers
      300: '#D7CBBC',
      400: '#B8A693',
      DEFAULT: '#E9E1D6',
    },
    gold: {
      50: '#FAF7F2',
      100: '#F2EAE0',
      200: '#E2D1BE',
      300: '#CDB596',
      400: '#B89A70', // Accents & Highlights
      500: '#9C7E55',
      600: '#7C623E',
      DEFAULT: '#B89A70',
    },
  },

  // Responsive Breakpoints
  breakpoints: {
    sm: '640px',   // Mobile Landscape / Phablet
    md: '768px',   // Tablet Portrait
    lg: '1024px',  // Tablet Landscape / Small Desktop
    xl: '1280px',  // Standard Desktop
    '2xl': '1440px'// Large Desktop
  },

  // Max Container Widths
  containers: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1240px', // Standard WedFlow Container Width
    '2xl': '1360px',
  },

  // Touch Target Standards (WCAG 2.5.5 / 2.5.8 AAA & AA)
  touchTargets: {
    min: '44px',        // Minimum accessible touch target (iOS / Material)
    preferred: '48px',  // Preferred comfortable touch target
    iconBox: '44px',
  },

  // Spacing Scale (4px baseline grid)
  spacing: {
    0: '0px',
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

  // Fluid Typography Scale
  typography: {
    fonts: {
      serif: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
      display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
      sans: '"Plus Jakarta Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    // Fluid clamps for responsive editorial headlines
    sizes: {
      h1: 'clamp(2rem, 5vw + 1rem, 3.25rem)',       // 32px to 52px
      h2: 'clamp(1.625rem, 3.5vw + 0.75rem, 2.5rem)', // 26px to 40px
      h3: 'clamp(1.25rem, 2vw + 0.5rem, 1.75rem)',    // 20px to 28px
      body: '1rem',                                 // 16px
      bodySm: '0.875rem',                           // 14px
      meta: '0.75rem',                              // 12px
    }
  },

  // Border Radii
  radii: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.25rem',// 20px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Soft Shadows
  shadows: {
    soft: '0 2px 10px rgba(40, 38, 37, 0.04), 0 1px 3px rgba(40, 38, 37, 0.02)',
    card: '0 8px 24px -4px rgba(40, 38, 37, 0.06), 0 2px 6px -2px rgba(40, 38, 37, 0.03)',
    'card-hover': '0 16px 36px -6px rgba(40, 38, 37, 0.09), 0 4px 12px -2px rgba(40, 38, 37, 0.04)',
    modal: '0 24px 64px -12px rgba(40, 38, 37, 0.2), 0 8px 24px -6px rgba(40, 38, 37, 0.08)',
  }
} as const;

export type DesignTokens = typeof tokens;
