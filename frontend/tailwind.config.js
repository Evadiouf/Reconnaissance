/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#002222',
        'dark-card': '#003E3E',
        'primary': '#03D9D9',
        'white': '#FFFFFF',
      },
      fontFamily: {
        'audiowide': ['Audiowide', 'cursive'],
        'instrument': ['Instrument Sans', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}



