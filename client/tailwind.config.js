/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Base */
        background: "var(--color-background)",
        "background-muted": "var(--color-background-muted)",
        text: "var(--color-text)",

        /* Palettes — each category: fill, text-on-fill, border, muted-surface, muted-hover */
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-border": "var(--color-primary-border)",
        "primary-shadow": "var(--color-primary-shadow)",
        "primary-text": "var(--color-primary-text)",
        "primary-muted": "var(--color-primary-muted)",
        "primary-muted-hover": "var(--color-primary-muted-hover)",

        secondary: "var(--color-secondary)",
        "secondary-hover": "var(--color-secondary-hover)",
        "secondary-border": "var(--color-secondary-border)",
        "secondary-shadow": "var(--color-secondary-shadow)",
        "secondary-text": "var(--color-secondary-text)",
        "secondary-muted": "var(--color-secondary-muted)",
        "secondary-muted-hover": "var(--color-secondary-muted-hover)",

        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-border": "var(--color-accent-border)",
        "accent-shadow": "var(--color-accent-shadow)",
        "accent-text": "var(--color-accent-text)",
        "accent-muted": "var(--color-accent-muted)",
        "accent-muted-hover": "var(--color-accent-muted-hover)",

        success: "var(--color-success)",
        "success-hover": "var(--color-success-hover)",
        "success-border": "var(--color-success-border)",
        "success-shadow": "var(--color-success-shadow)",
        "success-text": "var(--color-success-text)",
        "success-muted": "var(--color-success-muted)",
        "success-muted-hover": "var(--color-success-muted-hover)",

        warning: "var(--color-warning)",
        "warning-hover": "var(--color-warning-hover)",
        "warning-border": "var(--color-warning-border)",
        "warning-shadow": "var(--color-warning-shadow)",
        "warning-text": "var(--color-warning-text)",
        "warning-muted": "var(--color-warning-muted)",
        "warning-muted-hover": "var(--color-warning-muted-hover)",

        danger: "var(--color-danger)",
        "danger-hover": "var(--color-danger-hover)",
        "danger-border": "var(--color-danger-border)",
        "danger-shadow": "var(--color-danger-shadow)",
        "danger-text": "var(--color-danger-text)",
        "danger-muted": "var(--color-danger-muted)",
        "danger-muted-hover": "var(--color-danger-muted-hover)",

        info: "var(--color-info)",
        "info-hover": "var(--color-info-hover)",
        "info-border": "var(--color-info-border)",
        "info-shadow": "var(--color-info-shadow)",
        "info-text": "var(--color-info-text)",
        "info-muted": "var(--color-info-muted)",
        "info-muted-hover": "var(--color-info-muted-hover)",

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
        "card-muted": "var(--color-card-muted)",
        "card-muted-hover": "var(--color-card-muted-hover)",

        "fx-grid-line": "var(--fx-grid-line)",
        "fx-glow-1": "var(--fx-glow-1)",
        "fx-glow-2": "var(--fx-glow-2)",
      },
      keyframes: {
        "upload-slide": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(320%)" },
        },
      },
      animation: {
        "upload-slide": "upload-slide 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
