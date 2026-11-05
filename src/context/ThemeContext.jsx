import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "theme";
const THEME_MODES = ["light", "dark", "system"];

const getInitialTheme = () => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(storedTheme) ? storedTheme : "light";
  } catch {
    return "light";
  }
};

const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event) => setSystemTheme(event.matches ? "dark" : "light");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateSystemTheme);
      return () => mediaQuery.removeEventListener("change", updateSystemTheme);
    }

    mediaQuery.addListener(updateSystemTheme);
    return () => mediaQuery.removeListener(updateSystemTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";

    root.classList.toggle("dark", isDark);
    root.dataset.theme = theme;
    root.style.colorScheme = resolvedTheme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
  }, [theme, resolvedTheme]);

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
