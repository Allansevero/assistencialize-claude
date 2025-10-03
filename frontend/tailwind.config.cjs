/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: '#e7f6ec',
          100: '#c3e9d2',
          200: '#9ddcb5',
          300: '#75ce98',
          400: '#56c383',
          500: '#25d366',
          600: '#1eb757',
          700: '#199547',
          800: '#137437',
          900: '#0d5227',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
