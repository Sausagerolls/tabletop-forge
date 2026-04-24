/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#f4e4bc',
        'dnd-red': '#8b1a1a',
        'dnd-gold': '#c9a84c',
        'dnd-dark': '#1a1a2e',
        'dnd-panel': '#16213e',
      },
      fontFamily: {
        sans:    ['"Crimson Pro"', 'Georgia', 'serif'],
        serif:   ['"Cinzel"', '"Palatino Linotype"', 'Georgia', 'serif'],
        cinzel:  ['"Cinzel"', 'serif'],
        crimson: ['"Crimson Pro"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
