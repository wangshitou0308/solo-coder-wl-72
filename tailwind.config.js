/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        midnight: "#0E1320",
        "midnight-light": "#141B2D",
        "midnight-lighter": "#1A2237",
        "midnight-border": "#243049",
        amber: {
          DEFAULT: "#F5A524",
          50: "#FFF8E7",
          100: "#FFEFC2",
          200: "#FFE08A",
          300: "#FFD152",
          400: "#F5A524",
          500: "#E08A00",
          600: "#B86E00",
          700: "#8A5200",
          800: "#5C3700",
          900: "#2E1C00",
        },
        cyan: {
          DEFAULT: "#38BDF8",
          dark: "#0EA5E9",
        },
        eco: "#34D399",
        fault: "#F87171",
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        manrope: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(245, 165, 36, 0.15)",
        "glow-lg": "0 0 40px rgba(245, 165, 36, 0.25)",
        card: "0 4px 24px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        "solar-radial":
          "radial-gradient(ellipse at top, rgba(245,165,36,0.08) 0%, transparent 60%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
