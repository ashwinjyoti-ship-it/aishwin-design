import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0C0C0C",
        charcoal: "#181818",
        "dark-charcoal": "#222222",
        "warm-grey": "#2A2A28",
        "forge-amber": "#D4943A",
        "dark-amber": "#A6722F",
        copper: "#A67C52",
        "warm-gold": "#E5B86A",
        "warm-white": "#E6DFD3",
        "muted-cream": "#B8B0A4",
        "ash-grey": "#7A756D",
        "dim-grey": "#4A4742",
        success: "#6B9B7A",
        warning: "#C4A24D",
        error: "#B86060",
        info: "#6B8FA3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
      },
      letterSpacing: {
        tightish: "-0.012em",
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
