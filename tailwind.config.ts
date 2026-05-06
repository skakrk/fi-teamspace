import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#25D366',
          dark: '#128C7E',
          deep: '#075E54',
        },
        bubble: '#DCF8C6',
        bg: '#F7F8FA',
        surface: '#FFFFFF',
        muted: '#6B7280',
        border: '#E5E7EB',
        ink: '#111827',
        warn: '#F59E0B',
        ok: '#16A34A',
        bad: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        pop: '0 4px 12px 0 rgb(0 0 0 / 0.08)',
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
} satisfies Config;
