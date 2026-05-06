import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1E8',
        'cream-deep': '#EDE7D7',
        ink: '#191919',
        'ink-soft': '#3D3D3A',
        coral: '#D97757',
        sienna: '#BD5D3A',
        clay: '#CC785C',
        tan: '#E8C9A8',
        bark: '#8B5A3C',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(25,25,25,0.04), 0 8px 24px rgba(25,25,25,0.06)',
        focus: '0 0 0 3px rgba(217,119,87,0.25)',
      },
    },
  },
  plugins: [],
}

export default config
