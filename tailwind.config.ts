import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "navy-950": "#0A0F1A",
        "navy-800": "#0D1830",
        orange: "#F77828",
        blue: "#4F9DFF",
        ink: "#EEF3FA",
      },
      fontFamily: {
        sans: ["var(--font-heading)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
