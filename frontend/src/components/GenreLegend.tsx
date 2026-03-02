"use client";
import { GENRE_COLORS } from "@/lib/constants";

export default function GenreLegend() {
  return (
    <div className="bg-gray-800/80 backdrop-blur border border-gray-700 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Genres</h4>
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(GENRE_COLORS).map(([genre, color]) => (
          <div key={genre} className="flex items-center gap-2 text-xs text-gray-300">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{genre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
