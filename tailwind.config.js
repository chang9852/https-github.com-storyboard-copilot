/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          hover: "#2563eb",
          active: "#1d4ed8",
          light: "#dbeafe",
        },
        bg: {
          dark: "var(--bg)",
        },
        surface: {
          primary: "var(--surface)",
          secondary: "var(--bg)",
          tertiary: "var(--border)",
        },
        text: {
          primary: "var(--text)",
          secondary: "var(--text-muted)",
          muted: "rgba(128, 128, 128, 0.6)",
        },
        border: {
          DEFAULT: "var(--border)",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
};
