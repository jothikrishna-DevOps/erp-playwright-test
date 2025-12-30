/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Calm, earthy tones inspired by Isha Foundation
        earth: {
          50: '#faf8f5',
          100: '#f4f1ea',
          200: '#e8e0d4',
          300: '#d4c7b3',
          400: '#b8a68a',
          500: '#9d8a6f',
          600: '#7d6d57',
          700: '#655848',
          800: '#544a3d',
          900: '#473f35',
        },
        sage: {
          50: '#f6f7f4',
          100: '#e9ede4',
          200: '#d3dac9',
          300: '#b4c0a6',
          400: '#94a382',
          500: '#788668',
          600: '#5f6b52',
          700: '#4d5644',
          800: '#41473a',
          900: '#383d32',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

