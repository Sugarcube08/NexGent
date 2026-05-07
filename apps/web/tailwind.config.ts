import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)"],
        mono: ["var(--font-jetbrains-mono)"],
      },
      colors: {
        cyber: {
          cyan: "#00f3ff",
          magenta: "#ff00ff",
          yellow: "#f3ff00",
          blue: "#2d00ff",
          background: "#020204",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
        "cyber-grid": "linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)",
      },
      boxShadow: {
        "neon-cyan": "0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.2)",
        "neon-magenta": "0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.2)",
        "glass-inner": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-cyan": "glow-cyan 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "glow-cyan": {
          "0%": { boxShadow: "0 0 5px rgba(0, 243, 255, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 243, 255, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
