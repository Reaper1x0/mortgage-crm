/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Base */
        background: "var(--color-background)",
        text: "var(--color-text)",

        /* Palettes */
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-border": "var(--color-primary-border)",
        "primary-shadow": "var(--color-primary-shadow)",
        "primary-text": "var(--color-primary-text)",

        secondary: "var(--color-secondary)",
        "secondary-hover": "var(--color-secondary-hover)",
        "secondary-border": "var(--color-secondary-border)",
        "secondary-shadow": "var(--color-secondary-shadow)",
        "secondary-text": "var(--color-secondary-text)",

        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-border": "var(--color-accent-border)",
        "accent-shadow": "var(--color-accent-shadow)",
        "accent-text": "var(--color-accent-text)",

        success: "var(--color-success)",
        "success-hover": "var(--color-success-hover)",
        "success-border": "var(--color-success-border)",
        "success-shadow": "var(--color-success-shadow)",
        "success-text": "var(--color-success-text)",

        warning: "var(--color-warning)",
        "warning-hover": "var(--color-warning-hover)",
        "warning-border": "var(--color-warning-border)",
        "warning-shadow": "var(--color-warning-shadow)",
        "warning-text": "var(--color-warning-text)",

        danger: "var(--color-danger)",
        "danger-hover": "var(--color-danger-hover)",
        "danger-border": "var(--color-danger-border)",
        "danger-shadow": "var(--color-danger-shadow)",
        "danger-text": "var(--color-danger-text)",

        info: "var(--color-info)",
        "info-hover": "var(--color-info-hover)",
        "info-border": "var(--color-info-border)",
        "info-shadow": "var(--color-info-shadow)",
        "info-text": "var(--color-info-text)",

        link: "var(--color-link)",
        "link-hover": "var(--color-link-hover)",
        "link-border": "var(--color-link-border)",
        "link-shadow": "var(--color-link-shadow)",
        "link-text": "var(--color-link-text)",

        card: "var(--color-card)",
        "card-hover": "var(--color-card-hover)",
        "card-border": "var(--color-card-border)",
        "card-shadow": "var(--color-card-shadow)",
        "card-text": "var(--color-card-text)",

        "fx-grid-line": "var(--fx-grid-line)",
        "fx-glow-1": "var(--fx-glow-1)",
        "fx-glow-2": "var(--fx-glow-2)",
      },
      fontFamily: {
        sora: ['"Sora"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
