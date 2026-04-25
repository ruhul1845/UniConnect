/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        uniBlue: '#071a52',
        uniGold: '#f6b800',
        uniLight: '#f5f8ff',
      },
    },
  },
  plugins: [],
};
