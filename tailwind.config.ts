import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          subtle: '#161922',
          muted: '#1d2230',
          border: '#252b3b',
        },
        ink: {
          DEFAULT: '#e8eaf0',
          muted: '#8892a4',
          faint: '#4a5366',
        },
        accent: {
          DEFAULT: '#4f7fff',
          hover: '#3d6ef0',
          muted: '#1a2f5e',
        },
        status: {
          approved: '#22c55e',
          draft: '#f59e0b',
          archived: '#6b7280',
        },
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle, #252b3b 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '28px 28px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.35s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
