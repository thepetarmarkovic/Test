/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#D4AF37',
          light: '#FFD700',
          dark: '#C9A84C',
          dim: '#996515',
        },
        empire: {
          bg: '#050505',
          surface: '#0d0d0d',
          elevated: '#151515',
          border: '#1f1f1f',
          muted: '#555555',
          text: '#888888',
        },
        neon: '#00D4FF',
        success: '#00FF87',
        danger: '#FF4141',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
