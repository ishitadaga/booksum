"use client";
import Link from "next/link";
import { GENRE_COLORS } from "@/lib/constants";
import type { Playlist } from "@/lib/types";

export default function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const genreColor = GENRE_COLORS[playlist.genre || ""] || "#666";

  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="block bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold truncate">{playlist.name}</h3>
          <p className="text-gray-400 text-sm mt-1">by {playlist.username}</p>
        </div>
        {playlist.genre && (
          <span
            className="text-xs px-2 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: genreColor + "22", color: genreColor }}
          >
            {playlist.genre}
          </span>
        )}
      </div>
      {playlist.description && (
        <p className="text-gray-500 text-sm mt-2 line-clamp-2">{playlist.description}</p>
      )}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span>{playlist.book_count} books</span>
        {!playlist.is_public && <span className="text-yellow-500">Private</span>}
      </div>
    </Link>
  );
}
