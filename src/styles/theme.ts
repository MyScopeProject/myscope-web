// � Rasaswadaya Theme Configuration
// Purpose: Defines brand colors, gradients, fonts, and design tokens

export const theme = {
  colors: {
    bg: {
      primary: '#07060A',
      secondary: '#0F0D14',
    },
    surface: {
      1: '#15121D',
      2: '#1E1A2B',
      3: '#2A2F4A',
      4: '#2E2A3E',
    },
    text: {
      primary: '#F5F3FA',
      secondary: '#9B95B5',
      muted: '#7D8BA8',
    },
    accent: {
      primary: '#A78BFA',
      light: '#C4B5FD',
      hotPink: '#B794F6',
      pink: '#D8C7FE',
      indigo: '#6366F1',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      destructive: '#ef4444',
      info: '#3b82f6',
    },
    border: 'rgba(196, 181, 253, 0.1)',
    borderLight: 'rgba(196, 181, 253, 0.28)',
  },
  gradient: {
    hero: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.08) 50%, rgba(255, 122, 198, 0.05) 100%)',
    ai: 'linear-gradient(110deg, #7C3AED, #A78BFA, #6366F1)',
    aurora: 'radial-gradient(ellipse at 50% 30%, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.08) 40%, transparent 80%)',
    vignette: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%)',
    textGradient: 'linear-gradient(110deg, #A78BFA, #C4B5FD, #6366F1)',
  },
  shadow: {
    soft: '0 4px 24px rgba(0, 0, 0, 0.5)',
    md: '0 12px 36px rgba(0, 0, 0, 0.4)',
    glow: '0 0 20px rgba(167, 139, 250, 0.35)',
    aiGlow: '0 0 30px rgba(255, 122, 198, 0.3)',
    lift: '0 24px 50px rgba(167, 139, 250, 0.35)',
  },
  font: {
    display: "'Outfit', sans-serif",
    heading: "'Outfit', sans-serif",
    body: "'Inter', sans-serif",
    ui: "'Inter', sans-serif",
    premium: "'Playfair Display', serif",
    mono: "'IBM Plex Mono', monospace",
  },
  animation: {
    duration: {
      fast: '200ms',
      standard: '300ms',
      slow: '600ms',
    },
    easing: {
      cubic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      outSine: 'cubic-bezier(0.61, 1, 0.88, 1)',
      inSine: 'cubic-bezier(0.12, 0, 0.39, 0)',
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
  },
};
