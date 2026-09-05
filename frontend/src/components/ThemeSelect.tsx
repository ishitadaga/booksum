"use client";
import { useTheme, type Theme } from "@/context/ThemeContext";

export default function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="flex items-center gap-2 text-muted text-xs">
      <span className="sr-only">Color theme</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
      </svg>
      <select aria-label="Color theme" value={theme} onChange={event => setTheme(event.target.value as Theme)}
        className="min-h-11 max-w-24 bg-canvas text-secondary border border-line rounded-lg pl-2 pr-1 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
