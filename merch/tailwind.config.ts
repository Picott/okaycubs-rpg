import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#07080f',
        deep:     '#0d0f1a',
        stratum:  '#12151f',
        gold:     '#d4af37',
        gold2:    '#f5e06e',
        silver:   '#b8bcc8',
        quartz:   '#e8eaf0',
        magma:    '#c0392b',
        lava:     '#e67e22',
        jade:     '#2ecc71',
        sapphire: '#3498db',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        'cinzel-deco': ['"Cinzel Decorative"', 'serif'],
        crimson: ['"Crimson Pro"', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
