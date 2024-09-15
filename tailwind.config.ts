import { mclTheme } from '@bobbykim/manguito-theme/mcl-theme'
import type { Config } from 'tailwindcss'

/** @type {import('tailwindcss').Config} */
export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,ts,js,cjs}',
    './pages/**/*.{vue,ts,js,cjs}',
    './layouts/**/*.{vue,ts,js,cjs}',
    './node_modules/@bobbykim/**/*.{vue,ts,js,cjs}',
  ],
  theme: {
    extend: {
      animation: {
        balls: 'balls 5s infinite',
      },
      keyframes: {
        balls: {
          '0%, 100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        marker: ["'Permanent Marker'", 'cursive'],
      },
    },
  },
  plugins: [mclTheme],
}
