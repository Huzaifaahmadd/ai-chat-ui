import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0d1117",
        panel: "#141a24",
        "panel-raised": "#1b2330",
        line: "#252e3d",
        ink: "#e7ebf2",
        muted: "#8b96a8",
        signal: "#f2a341",
        "signal-dim": "#3a2f1c",
        wire: "#5fb8b8",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
