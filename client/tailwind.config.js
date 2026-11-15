/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      colors: {
        brand: { 50: '#e7fbfd', 100: '#c8f3f7', 400: '#62d9e8', 500: '#18b6c9', 600: '#07899a', 700: '#086a78' },
      },
      boxShadow: { soft: '0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(0,0,0,.04)' },
      keyframes: { 'fade-in': { from: { opacity: '0', transform: 'translateY(5px)' }, to: { opacity: '1', transform: 'translateY(0)' } } },
      animation: { 'fade-in': 'fade-in .22s ease-out' },
    },
  },
  plugins: [],
};
