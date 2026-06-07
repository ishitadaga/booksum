"use client";
import Link from "next/link";
import { GENRE_COLORS } from "@/lib/constants";
import type { Playlist } from "@/lib/types";

export default function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const genreColor = GENRE_COLORS[playlist.genre || ""] || "#666";
  const covers = playlist.preview_covers || [];

  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition"
    >
      <div className="flex gap-4">
        {/* 2x2 cover mosaic */}
        <div className="w-24 h-24 flex-shrink-0 grid grid-cols-2 grid-rows-2 gap-0.5 rounded-lg overflow-hidden">
          {covers.length > 0 ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-700">
                  {covers[i] ? (
                    <img src={covers[i]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-700" />
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-2 row-span-2 bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-white font-semibold truncate">{playlist.name}</h3>
            {playlist.genre && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: genreColor + "22", color: genreColor }}
              >
                {playlist.genre}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-0.5">by {playlist.username}</p>
          {playlist.description && (
            <p className="text-gray-500 text-sm mt-1.5 line-clamp-2">{playlist.description}</p>
          )}
          <div className="flex items-center gap-3 mt-auto pt-2 text-xs text-gray-500">
            <span>{playlist.book_count} books</span>
            {!playlist.is_public && <span className="text-yellow-500">Private</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
