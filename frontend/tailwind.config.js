/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'monospace'],
      },
      letterSpacing: {
        beacon: '0.4em',
      },
      backdropBlur: {
        capsule: '12px',
      },
    },
  },
  plugins: [],
}
