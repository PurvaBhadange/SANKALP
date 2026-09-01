/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: "#FFFDF5",
          ink: "#000000",
          accent: "#FF6B6B",
          secondary: "#FFD93D",
          muted: "#C4B5FD",
          card: "#FFFFFF",
        },
        navy: {
          50: "#e3e8f1",
          100: "#c7d1e3",
          200: "#8fa3c6",
          300: "#5675a8",
          400: "#1e477b",
          500: "#0a1f44",
          600: "#081c3b",
          700: "#061832",
          800: "#041428",
          900: "#020f1f",
        },
        sky: {
          500: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "Inter", "ui-sans-serif", "system-ui"],
        display: ["'Space Grotesk'", "sans-serif"],
      },
      boxShadow: {
        'neo-sm': '4px 4px 0px 0px #000000',
        'neo': '8px 8px 0px 0px #000000',
        'neo-lg': '12px 12px 0px 0px #000000',
        'neo-xl': '16px 16px 0px 0px #000000',
        'neo-white': '8px 8px 0px 0px #FFFFFF',
      },
    },
  },
  plugins: [],
}
