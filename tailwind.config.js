/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // MyScope - Premium Violet Theme
        bg: {
          dark: '#07060A',    // Premium dark background
          darker: '#000000',
          DEFAULT: '#07060A',
        },
        surface: {
          1: '#15121D',       // Surface 1
          2: '#1E1A2B',       // Surface 2
          3: '#2A2F4A',       // Surface 3
          DEFAULT: '#15121D',
        },
        border: {
          DEFAULT: 'rgba(196, 181, 253, 0.10)',  // Violet border
        },
        text: {
          primary: '#F5F3FA',      // Light text
          secondary: '#9B95B5',    // Secondary text
          muted: '#7D8BA8',        // Muted text
        },
        accent: {
          primary: '#A78BFA',      // Primary accent violet
          purple: '#A78BFA',       // Light purple
          'hot-pink': '#B794F6',   // Hot pink replacement (violet)
        },
        status: {
          destructive: '#FF6B6B',
          success: '#10b981',
          warning: '#f59e0b',
          info: '#3b82f6',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        'plex-sans': ['IBM Plex Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        abhaya: ['Abhaya Libre', 'serif'],
        'geist-mono': ['Geist Mono', 'monospace'],
      },
      fontSize: {
        // Fluid typography
        'xs': ['clamp(0.75rem, 0.8vw, 0.875rem)', { lineHeight: '1.5' }],
        'sm': ['clamp(0.875rem, 0.9vw, 1rem)', { lineHeight: '1.4' }],
        'base': ['clamp(0.95rem, 1vw, 1.125rem)', { lineHeight: '1.6' }],
        'lg': ['clamp(1.125rem, 1.2vw, 1.25rem)', { lineHeight: '1.5' }],
        'xl': ['clamp(1.25rem, 3vw, 1.75rem)', { lineHeight: '1.3' }],
        '2xl': ['clamp(1.75rem, 5vw, 2.5rem)', { lineHeight: '1.2' }],
        '3xl': ['clamp(2.5rem, 8vw, 4rem)', { lineHeight: '1.1' }],
      },
      spacing: {
        // Token-based spacing (4px units)
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
      animation: {
        'ken-burns': 'kenBurns 18s linear infinite',
        'ai-orb': 'aiOrb 3s ease-in-out infinite',
        'scan-line': 'scanLine 2.6s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        kenBurns: {
          from: { transform: 'scale(1) translate(0, 0)' },
          to: { transform: 'scale(1.15) translate(15px, 20px)' },
        },
        aiOrb: {
          '0%': { transform: 'scale(0.8)', opacity: '0.6' },
          '50%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.8)', opacity: '0.6' },
        },
        scanLine: {
          '0%': { top: '0%', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
        'ease-out-sine': 'cubic-bezier(0.61, 1, 0.88, 1)',
        'ease-in-sine': 'cubic-bezier(0.12, 0, 0.39, 0)',
      },
      boxShadow: {
        'soft': '0 4px 24px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 15px rgba(167, 139, 250, 0.4)',
        'ai': '0 0 30px rgba(255, 122, 198, 0.3)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
      opacity: {
        border: '0.1',
      },
    },
  },
  plugins: [],
};
