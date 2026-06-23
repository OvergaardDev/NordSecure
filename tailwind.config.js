/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669'
        }
      },
      keyframes: {
        'pulse-scale': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' }
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      animation: {
        'pulse-scale': 'pulse-scale 2s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 0.6s ease-in-out',
        'fade-in': 'fade-in 0.3s ease-out'
      }
    }
  },
  plugins: []
}
