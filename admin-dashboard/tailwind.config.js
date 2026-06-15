/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        surface: '#161616',
        'surface-2': '#1F1F1F',
        border: '#2A2A2A',
        brand: '#4C91FF',
        'brand-dark': '#3A7AE0',
        gold: '#FFB547',
        muted: '#9CA3AF',
      },
    },
  },
  plugins: [],
};
