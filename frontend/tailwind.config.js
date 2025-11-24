/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['ui-sans-serif', 'system-ui'],
      inter: ['Inter', 'ui-sans-serif', 'system-ui'],
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1380px',
      '2xl': '1836px'
    },
    boxShadow: {
      '3xl': '0 35px 60px 0px rgba(0, 0, 0, 0.8)'
    },
    dropShadow: {
      '3xl': '0 3px 3px rgba(0, 0, 0, .45)',
      '4xl': ['0 35px 35px rgba(0, 0, 0, 0.25)', '0 45px 65px rgba(0, 0, 0, 0.15)']
    },
    extend: {}
  },
  plugins: [require('tailwindcss-animated')],
}
