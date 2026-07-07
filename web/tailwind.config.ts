import type { Config } from 'tailwindcss'

// The Sona design system is CSS-variable driven (see app/globals.css), so the
// Tailwind theme stays intentionally thin. Utilities are used for layout
// (flex, spacing, truncate); colours come from the Pine token variables.
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
