"use client";
import { GENRE_COLORS } from "@/lib/constants";
import type { GraphNode } from "@/lib/types";

interface Props {
  node: GraphNode | null;
  onClose: () => void;
  onFindSimilar: (bookId: string) => void;
  onAddToPlaylist?: (bookId: string) => void;
  onExpandNode?: (bookId: string) => void;
  isExpanding?: boolean;
}

export default function BookDetailSidebar({ node, onClose, onFindSimilar, onAddToPlaylist, onExpandNode, isExpanding }: Props) {
  if (!node) return null;

  const genreColor = GENRE_COLORS[node.genre || ""] || "#666";

  // Truncate description to ~400 chars so it fits without scrolling
  const desc = node.description || "";
  const truncated = desc.length > 400 ? desc.slice(0, 400).trimEnd() + "..." : desc;

  return (
    <div className="absolute top-16 right-4 z-30 w-[340px] max-w-[calc(100%-2rem)] bg-surface/95 backdrop-blur-sm border border-line rounded-xl shadow-2xl flex flex-col max-h-[calc(100svh-10rem)] overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-line/60">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-primary font-semibold text-sm leading-snug line-clamp-2">{node.label}</h3>
          <button
            onClick={onClose}
            aria-label="Close book details"
            className="text-muted hover:text-primary transition min-w-11 min-h-11 flex items-center justify-center -mr-2 -mt-2 flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        {node.author && (
          <p className="text-muted text-xs mt-1">{node.author}</p>
        )}
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {node.genre && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: genreColor + "22", color: "rgb(var(--primary))" }}
            >
              {node.genre}
            </span>
          )}
          {node.publication_year && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-raised text-secondary">
              {node.publication_year}
            </span>
          )}
          {node.rating && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-raised text-warning">
              {node.rating.toFixed(1)}
            </span>
          )}
          {!node.is_center && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-link/10 text-link font-medium">
              {(node.similarity * 100).toFixed(1)}% similar
            </span>
          )}
        </div>
      </div>

      {/* Abstract — fixed height, no scroll */}
      {truncated && (
        <div className="px-4 py-3">
          <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1.5">
            Abstract
          </h4>
          <p className="text-secondary text-xs leading-relaxed">
            {truncated}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-3 pt-1 flex gap-2">
        {!node.is_center && (
          <button
            onClick={() => onFindSimilar(node.id)}
            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium"
          >
            Find Similar
          </button>
        )}
        {onExpandNode && (
          <button
            onClick={() => onExpandNode(node.id)}
            disabled={isExpanding}
            className="flex-1 text-xs bg-green-700 hover:bg-green-800 disabled:bg-green-900 disabled:text-success text-white py-2 rounded-lg transition font-medium"
          >
            {isExpanding ? "Expanding..." : "Expand Graph"}
          </button>
        )}
        {onAddToPlaylist && (
          <button
            onClick={() => onAddToPlaylist(node.id)}
            className="flex-1 text-xs bg-raised hover:bg-hover text-primary py-2 rounded-lg transition"
          >
            Add to Playlist
          </button>
        )}
      </div>
    </div>
  );
}
