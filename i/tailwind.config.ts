import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111318",
        panel: "#1c2028",
        mint: "#40f2a2",
        cyan: "#41d9ff",
        amber: "#ffbf5a",
        danger: "#ff5a70"
      }
    }
  },
  plugins: []
};

export default config;
