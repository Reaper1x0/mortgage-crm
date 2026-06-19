import { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "../constants/theme.constants";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const storedTheme = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
  const [theme, setTheme] = useState<Theme>(storedTheme || "dark");

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

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
