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
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        background: "#0a0a0c",
        foreground: "#fafafa",
        cyber: {
          cyan: "#00f3ff",
          blue: "#2d00ff",
          magenta: "#ff00ff",
          muted: {
            cyan: "rgba(0, 243, 255, 0.15)",
            white: "rgba(255, 255, 255, 0.05)",
          }
        },
      },
      backgroundImage: {
        "gradient-main": "radial-gradient(circle at 50% -20%, rgba(0, 243, 255, 0.08) 0%, transparent 40%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)",
      },
      boxShadow: {
        "soft-glow": "0 0 20px rgba(0, 243, 255, 0.1)",
        "premium-card": "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.5s ease-out forwards",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
