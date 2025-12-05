/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/index.html', './frontend/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['ui-sans-serif', 'system-ui'],
      inter: ['Inter', 'ui-sans-serif', 'system-ui'],
      'space-mono': ['Space Mono', 'ui-sans-serif', 'system-ui']
    },
    screens: {
      // Mobile-first breakpoints
      'xs': '320px',
      // => @media (min-width: 320px) { ... } - Small phones

      sm: '640px',
      // => @media (min-width: 640px) { ... } - Large phones / small tablets

      md: '768px',
      // => @media (min-width: 768px) { ... } - Tablets

      lg: '1024px',
      // => @media (min-width: 1024px) { ... } - Laptops

      lg2: '1152px',
      // => @media (min-width: 1152px) { ... } - Small desktops

      xl: '1380px',
      // => @media (min-width: 1380px) { ... } - Desktops

      '2xl': '1836px',
      // => @media (min-width: 1836px) { ... } - Large desktops

      'tv': '1920px',
      // => @media (min-width: 1920px) { ... } - Full HD TVs

      'tv-4k': '3840px'
      // => @media (min-width: 3840px) { ... } - 4K TVs
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
  plugins: [require('tailwindcss-animated')]
}
