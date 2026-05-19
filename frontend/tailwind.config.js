/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'var(--color-primary-hover)',
        },
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        info: 'var(--color-info)',
        surface: 'var(--color-bg-surface)',
        elevated: 'var(--color-bg-elevated)',
        'page-bg': 'var(--color-bg-page)',
        'text-primary': 'rgb(var(--text-primary-rgb) / <alpha-value>)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
        },
      },
      textColor: {
        'c-primary': 'rgb(var(--text-primary-rgb) / <alpha-value>)',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      keyframes: {
        'node-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 0 3px rgba(0, 113, 227, 0.12)' },
          '50%': { boxShadow: '0 0 0 6px rgba(0, 113, 227, 0.25), 0 0 16px rgba(94, 92, 230, 0.15)' },
        },
        'node-glow-green': {
          '0%': { boxShadow: '0 0 0 3px rgba(48, 209, 88, 0)' },
          '100%': { boxShadow: '0 0 0 4px rgba(48, 209, 88, 0.20), 0 10px 28px rgba(48, 209, 88, 0.12)' },
        },
        'node-glow-red': {
          '0%': { boxShadow: '0 0 0 3px rgba(255, 107, 107, 0)' },
          '100%': { boxShadow: '0 0 0 4px rgba(255, 107, 107, 0.22), 0 10px 28px rgba(255, 107, 107, 0.12)' },
        },
        'node-glow-orange': {
          '0%': { boxShadow: '0 0 0 3px rgba(255, 159, 10, 0)' },
          '100%': { boxShadow: '0 0 0 4px rgba(255, 159, 10, 0.20), 0 10px 28px rgba(255, 159, 10, 0.12)' },
        },
      },
      animation: {
        'node-pulse-blue': 'node-pulse-blue 1.6s ease-in-out infinite',
        'node-glow-green': 'node-glow-green 300ms ease forwards',
        'node-glow-red': 'node-glow-red 300ms ease forwards',
        'node-glow-orange': 'node-glow-orange 300ms ease forwards',
      },
    },
  },
  plugins: [],
}
