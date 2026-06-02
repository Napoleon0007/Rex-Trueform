import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        casino: {
          bg:       '#000000',
          night:    '#0a0e1a',
          surface:  '#0f0f0f',
          chip:     '#0d0d0d',
          card:     '#111111',
          raised:   '#141414',
          elevated: '#1a1a1a',
          hairline: '#1e1e1e',
          border:   '#222222',
          edge:     '#2a2a2a',
          line:     '#333333',
          orange:   '#f97316',
          'orange-dim': 'rgba(249,115,22,0.12)',
          silver:  '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
