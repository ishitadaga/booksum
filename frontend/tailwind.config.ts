import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        hover: "rgb(var(--hover) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        strong: "rgb(var(--strong) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        link: "rgb(var(--link) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        fiction: "#4361ee",
        "non-fiction": "#3a86a8",
        mystery: "#7b2cbf",
        scifi: "#f72585",
        fantasy: "#4cc9f0",
        romance: "#ff6b6b",
        biography: "#fca311",
        history: "#8d6748",
        science: "#2ec4b6",
        selfhelp: "#80b918",
      },
    },
  },
  plugins: [],
};

export default config;
