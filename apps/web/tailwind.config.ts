import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta da seção 40: azul profundo + branco + tons suaves,
        // verde para confirmação, vermelho só para erro/alerta.
        brand: {
          DEFAULT: "#1E3A5F",
          dark: "#12263F",
          light: "#EAF1F8",
        },
        success: "#1F9D63",
        danger: "#C0392B",
        gold: "#C9A227",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
