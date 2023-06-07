/** @type {import('tailwindcss').Config} */

import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.green,
        secondary: colors.blue,
        background: colors.zinc,
        error: colors.red,
        warning: colors.yellow,
        success: colors.green,
        info: colors.blue,
      },
    },
    fontFamily: {
      sans: 'PTSerif',
      mono: 'PTMono',
    },
  },
  plugins: [],
};
