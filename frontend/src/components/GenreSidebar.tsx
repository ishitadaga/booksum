"use client";
import { GENRES, GENRE_COLORS } from "@/lib/constants";

interface GenreSidebarProps {
  selected: string | undefined;
  onSelect: (genre: string | undefined) => void;
}

export default function GenreSidebar({ selected, onSelect }: GenreSidebarProps) {
  return (
    <div className="w-52 flex-shrink-0">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
        Genres
      </h2>
      <ul className="space-y-1">
        <li>
          <button
            onClick={() => onSelect(undefined)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              !selected
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >
            All
          </button>
        </li>
        {GENRES.map((genre) => (
          <li key={genre}>
            <button
              onClick={() => onSelect(genre)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                selected === genre
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: GENRE_COLORS[genre] }}
              />
              {genre}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
