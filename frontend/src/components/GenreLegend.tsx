"use client";
import { GENRE_COLORS } from "@/lib/constants";

export default function GenreLegend() {
  return (
    <details className="bg-surface/95 backdrop-blur border border-line rounded-lg px-3">
      <summary className="text-xs font-semibold text-muted uppercase min-h-11 flex items-center cursor-pointer">Genres <span className="ml-auto" aria-hidden="true">⌄</span></summary>
      <div className="grid gap-2 pb-3">
        {Object.entries(GENRE_COLORS).map(([genre, color]) => (
          <div key={genre} className="flex items-center gap-2 text-xs text-secondary">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{genre}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
