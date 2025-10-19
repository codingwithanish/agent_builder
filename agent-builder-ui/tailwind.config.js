/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          draft: '#fbbf24',
          deploying: '#fde047',
          deployed: '#86efac',
          failed: '#ef4444',
        },
        edge: {
          default: '#cbd5e1',
          true: '#22c55e',
          false: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { opacity: '1' },
          '50%': { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

