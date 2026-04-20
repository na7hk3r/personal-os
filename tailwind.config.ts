/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e1e2e',
          light: '#2a2a3e',
          lighter: '#363650',
        },
        accent: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
        },
        chart: {
          grid: '#334155',
          axis: '#94a3b8',
          tooltipBg: '#1e1e2e',
          tooltipBorder: '#334155',
          weight: '#7c3aed',
          mealGood: '#22c55e',
          mealWarn: '#eab308',
          mealBad: '#ef4444',
          smoking: '#f97316',
        },
        muted: '#94a3b8',
        border: '#334155',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          from: { transform: 'translateX(-8px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px 0 rgba(124,58,237,0.4)' },
          '50%': { boxShadow: '0 0 12px 2px rgba(124,58,237,0.7)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to: { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out both',
        'slide-up': 'slideUp 0.25s ease-out both',
        'slide-right': 'slideRight 0.2s ease-out both',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
}
