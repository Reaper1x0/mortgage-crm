import { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "../constants/theme.constants";

/**
 * Theme Context Type
 */
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  applyBranding: (branding?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    customVars?: Record<string, string> | null;
  } | null) => void;
}

// Create Theme Context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider Component
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const storedTheme = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
  const [theme, setTheme] = useState<Theme>(storedTheme || "dark");

  const applyBranding = (
    branding?: {
      primaryColor?: string | null;
      secondaryColor?: string | null;
      customVars?: Record<string, string> | null;
    } | null
  ) => {
    const html = document.documentElement;
    if (!branding) return;
    if (branding.primaryColor) {
      html.style.setProperty("--color-primary", branding.primaryColor);
      html.style.setProperty("--color-primary-hover", branding.primaryColor);
      html.style.setProperty("--color-primary-border", branding.primaryColor);
    }
    if (branding.secondaryColor) {
      html.style.setProperty("--color-secondary", branding.secondaryColor);
      html.style.setProperty("--color-secondary-hover", branding.secondaryColor);
      html.style.setProperty("--color-secondary-border", branding.secondaryColor);
    }
    if (branding.customVars) {
      Object.entries(branding.customVars).forEach(([key, val]) => {
        if (key.startsWith("--") && val) html.style.setProperty(key, String(val));
      });
    }
  };

  useEffect(() => {
    const html = document.documentElement;

    html.classList.forEach((cls) => {
      if (cls.startsWith("theme-")) {
        html.classList.remove(cls);
      }
    });
    html.classList.add(`theme-${theme}`);

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom Hook to use Theme Context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
