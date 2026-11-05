import React, { useEffect, useRef, useState } from "react";
import { Moon, MoreHorizontal, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const targetTheme = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = resolvedTheme === "dark" ? Sun : Moon;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div ref={menuRef} className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setTheme(targetTheme)}
        aria-label={`Switch to ${targetTheme} theme`}
        title={`Switch to ${targetTheme} theme`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-[#33333a] dark:bg-[#131316] dark:text-zinc-200 dark:hover:bg-[#1e1e23]"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={`Theme options. Current mode: ${theme}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="Theme options"
        className="inline-flex h-8 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-zinc-300 dark:hover:bg-[#1e1e23]"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {menuOpen && (
        <div role="menu" aria-label="Theme mode" className="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-[#33333a] dark:bg-[#131316]">
          {["light", "dark", "system"].map((mode) => (
            <button
              key={mode}
              type="button"
              role="menuitemradio"
              aria-checked={theme === mode}
              onClick={() => { setTheme(mode); setMenuOpen(false); }}
              className={`w-full rounded-md px-3 py-2 text-left text-sm capitalize hover:bg-slate-100 dark:hover:bg-[#1e1e23] ${theme === mode ? "font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-400/10" : "text-slate-700 dark:text-zinc-200"}`}
            >
              {mode === "system" ? "System" : `${mode} mode`}
            </button>
          ))}
        </div>
      )} */}
    </div>
  );
};

export default ThemeToggle;
