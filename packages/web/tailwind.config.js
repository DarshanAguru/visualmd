/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sepia: {
          50: '#fbf0d9',
          100: '#f7e7c4',
          200: '#f0d39e',
          800: '#433422',
          900: '#2b2114',
        }
      }
    },
  },
  plugins: [],
}
