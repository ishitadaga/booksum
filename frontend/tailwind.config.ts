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
