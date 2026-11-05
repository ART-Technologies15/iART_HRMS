import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import ThemeScene, { SCENE_MS } from "./ThemeScene";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "theme";
const THEME_MODES = ["light", "dark", "system"];

// The real theme is swapped at the midpoint, while the scene fully covers the screen
const COMMIT_AT_MS = Math.round(SCENE_MS * 0.5);

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

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Writes the theme to <html> immediately (no React involved).
const applyDomTheme = (mode, resolved) => {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = mode;
  root.style.colorScheme = resolved;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [scene, setScene] = useState(null); // { type: "sunrise" | "sunset", key }
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  const themeRef = useRef(theme);
  const animatingRef = useRef(false);
  const timersRef = useRef([]);
  themeRef.current = theme;

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

  // Keeps <html> + localStorage in sync (initial load, system changes, after every switch)
  useEffect(() => {
    applyDomTheme(theme, resolvedTheme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
  }, [theme, resolvedTheme]);

  // clear pending timers on unmount
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  // Public setter: same signature as before, but the switch plays a sunrise / sunset scene.
  const setTheme = useCallback((next) => {
    const mode = typeof next === "function" ? next(themeRef.current) : next;
    if (!THEME_MODES.includes(mode) || mode === themeRef.current) return;
    if (animatingRef.current) return; // ignore clicks while a scene is playing

    const currentResolved = themeRef.current === "system" ? getSystemTheme() : themeRef.current;
    const nextResolved = mode === "system" ? getSystemTheme() : mode;

    // Nothing visible changes (e.g. light -> system on a light OS), or user prefers no motion
    if (currentResolved === nextResolved || prefersReducedMotion()) {
      applyDomTheme(mode, nextResolved);
      setThemeState(mode);
      return;
    }

    animatingRef.current = true;
    setScene({ type: nextResolved === "dark" ? "sunset" : "sunrise", key: Date.now() });

    timersRef.current.push(
      window.setTimeout(() => {
        applyDomTheme(mode, nextResolved);
        setThemeState(mode);
      }, COMMIT_AT_MS),
      window.setTimeout(() => {
        setScene(null);
        animatingRef.current = false;
      }, SCENE_MS)
    );
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, setTheme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {scene && <ThemeScene key={scene.key} type={scene.type} />}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};