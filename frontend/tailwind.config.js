/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        medical: {
          mint:  "#ECFDF5",
          teal:  "#0D9488",
          light: "#F0FDFA",
          bg:    "#F8FAFF",
        },
        danger: {
          light: "#FEF2F2",
          main:  "#EF4444",
          dark:  "#DC2626",
        },
        warning: {
          light: "#FFFBEB",
          main:  "#F59E0B",
          dark:  "#D97706",
        },
        success: {
          light: "#F0FDF4",
          main:  "#22C55E",
          dark:  "#16A34A",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card":    "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)",
        "card-md": "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.07)",
        "card-lg": "0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.07)",
        "sidebar":  "2px 0 8px rgba(0,0,0,0.06)",
      },
      animation: {
        "pulse-danger": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":      "fadeIn 0.2s ease-out",
        "slide-in":     "slideIn 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
