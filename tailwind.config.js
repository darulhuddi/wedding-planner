/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: '#71343B',
          50: '#FAF3F4',
          100: '#F3E4E6',
          200: '#E6C5C9',
          300: '#D39CA3',
          400: '#B86E78',
          500: '#8F444D',
          600: '#71343B',
          700: '#5A292F',
          800: '#451F23',
          900: '#301518',
        },
        ivory: {
          DEFAULT: '#FAF8F3',
          50: '#FDFCF9',
          100: '#FAF8F3',
          200: '#F4EFE6',
          300: '#EAE2D5',
        },
        beige: {
          DEFAULT: '#E9E1D6',
          50: '#F8F5F0',
          100: '#F2ECE2',
          200: '#E9E1D6',
          300: '#D7CBBC',
          400: '#B8A693',
        },
        charcoal: {
          DEFAULT: '#282625',
          50: '#F7F6F5',
          100: '#E6E4E2',
          200: '#C7C4C0',
          300: '#9F9A95',
          400: '#6E6964',
          500: '#4A4541',
          600: '#282625',
          700: '#1E1D1C',
          800: '#161514',
          900: '#0D0D0C',
        },
        gold: {
          DEFAULT: '#B89A70',
          50: '#FAF7F2',
          100: '#F2EAE0',
          200: '#E2D1BE',
          300: '#CDB596',
          400: '#B89A70',
          500: '#9C7E55',
          600: '#7C623E',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(40, 38, 37, 0.04), 0 1px 3px rgba(40, 38, 37, 0.02)',
        'card': '0 8px 24px -4px rgba(40, 38, 37, 0.06), 0 2px 6px -2px rgba(40, 38, 37, 0.03)',
        'card-hover': '0 16px 36px -6px rgba(40, 38, 37, 0.09), 0 4px 12px -2px rgba(40, 38, 37, 0.04)',
        'modal': '0 24px 64px -12px rgba(40, 38, 37, 0.2), 0 8px 24px -6px rgba(40, 38, 37, 0.08)',
        'glow-burgundy': '0 8px 24px -4px rgba(113, 52, 59, 0.25)',
      },
      maxWidth: {
        'container': '1240px',
      }
    },
  },
  plugins: [],
}
