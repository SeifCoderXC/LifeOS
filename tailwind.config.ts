import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05060a",
        panel: "#0c0e14",
        line: "#1c2230",
        gold: "#d4a853",
        "gold-dim": "#8a6a2f",
        teal: "#3dcdc0",
        "teal-dim": "#1f6f68",
        rose: "#e06c75",
        paper: "#e8e4d9",
        mute: "#8b93a7",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(212, 168, 83, 0.12)",
        teal: "0 0 40px rgba(61, 205, 192, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
