/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pine: { DEFAULT: '#0F3D3E', deep: '#0A2B2C' },
        paper: { DEFAULT: '#F6F7F3', dim: '#E9ECE5' },
        saffron: { DEFAULT: '#E2984A', deep: '#C97D2E' },
        ink: { DEFAULT: '#13221F', soft: '#5B6B67' },
        line: '#DCE2DC',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
