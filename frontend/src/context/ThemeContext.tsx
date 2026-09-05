"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;
const storageKey = "booksum-theme";
const mediaQuery = "(prefers-color-scheme: dark)";
const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark" || value === "system";

const ThemeContext = createContext({ theme: "system" as Theme, resolvedTheme: "light" as ResolvedTheme, setTheme: (_theme: Theme) => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setPreference] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    let preference: Theme = "system";
    try { const saved = localStorage.getItem(storageKey); if (isTheme(saved)) preference = saved; } catch {}
    const apply = () => {
      const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      document.documentElement.dataset.theme = resolved;
      setPreference(preference);
      setResolvedTheme(resolved);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      preference = isTheme(event.newValue) ? event.newValue : "system";
      apply();
    };
    const onPreference = (event: Event) => { preference = (event as CustomEvent<Theme>).detail; apply(); };
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("storage", onStorage);
    window.addEventListener("booksum-theme-change", onPreference);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("booksum-theme-change", onPreference);
    };
  }, []);

  function setTheme(value: Theme) {
    try { localStorage.setItem(storageKey, value); } catch {}
    window.dispatchEvent(new CustomEvent("booksum-theme-change", { detail: value }));
  }
  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
