"use client";
import { GENRE_COLORS } from "@/lib/constants";
import type { GraphNode } from "@/lib/types";

interface Props {
  node: GraphNode | null;
  onClose: () => void;
  onFindSimilar: (bookId: string) => void;
  onAddToPlaylist?: (bookId: string) => void;
}

export default function BookDetailSidebar({ node, onClose, onFindSimilar, onAddToPlaylist }: Props) {
  if (!node) return null;

  const genreColor = GENRE_COLORS[node.genre || ""] || "#666";

  // Truncate description to ~400 chars so it fits without scrolling
  const desc = node.description || "";
  const truncated = desc.length > 400 ? desc.slice(0, 400).trimEnd() + "..." : desc;

  return (
    <div className="absolute top-16 right-4 z-30 w-[340px] bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700/60">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{node.label}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition p-0.5 -mr-0.5 flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        {node.author && (
          <p className="text-gray-400 text-xs mt-1">{node.author}</p>
        )}
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {node.genre && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: genreColor + "22", color: genreColor }}
            >
              {node.genre}
            </span>
          )}
          {node.publication_year && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
              {node.publication_year}
            </span>
          )}
          {node.rating && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-yellow-400">
              {node.rating.toFixed(1)}
            </span>
          )}
          {!node.is_center && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 font-medium">
              {(node.similarity * 100).toFixed(1)}% similar
            </span>
          )}
        </div>
      </div>

      {/* Abstract — fixed height, no scroll */}
      {truncated && (
        <div className="px-4 py-3">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Abstract
          </h4>
          <p className="text-gray-300 text-xs leading-relaxed">
            {truncated}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 pt-1 flex gap-2">
        {!node.is_center && (
          <button
            onClick={() => onFindSimilar(node.id)}
            className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition font-medium"
          >
            Find Similar
          </button>
        )}
        {onAddToPlaylist && (
          <button
            onClick={() => onAddToPlaylist(node.id)}
            className="flex-1 text-xs bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition"
          >
            Add to Playlist
          </button>
        )}
      </div>
    </div>
  );
}
