/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent1: '#260C8F',
        'light-bg': '#FFFFFF',
        'light-card': '#F9F9F9',
        'light-border': '#E5E5E5',
        'light-text': '#1F2937',
        'light-text-secondary': '#6B7280',
        practicum: {
          ink: '#0c0c1a',
          violet: '#1e1047',
          mist: '#f4f5fb',
          page: '#f5f6f7',
          cardShadow: 'rgba(15, 15, 25, 0.06)',
          cardShadowHover: 'rgba(15, 15, 25, 0.12)',
          cta: '#ff6a00',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      backgroundImage: {
        'practicum-hero': 'linear-gradient(135deg, #1e1047 0%, #0c0c1a 55%, #0c0c1a 100%)',
        'practicum-hero-glow':
          'radial-gradient(ellipse 85% 55% at 50% -15%, rgba(130, 90, 255, 0.35), transparent 55%)',
      },
      boxShadow: {
        'practicum-card': '0 4px 24px rgba(15, 15, 25, 0.06)',
        'practicum-card-hover': '0 12px 40px rgba(15, 15, 25, 0.12)',
        'practicum-section': '0 1px 0 rgba(0, 0, 0, 0.04)',
      },
      spacing: {},
    },
  },
  plugins: [],
}