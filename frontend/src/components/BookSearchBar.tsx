"use client";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBookSearch } from "@/hooks/useBookSearch";
import { GENRE_COLORS } from "@/lib/constants";

interface Props {
  onSelect?: (bookId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "sm" | "lg";
}

export default function BookSearchBar({
  onSelect,
  placeholder = "Search for a book...",
  autoFocus = false,
  size = "lg",
}: Props) {
  const { query, setQuery, results, loading } = useBookSearch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (bookId: string) => {
    setOpen(false);
    setQuery("");
    if (onSelect) {
      onSelect(bookId);
    } else {
      router.push(`/graph?book_id=${bookId}`);
    }
  };

  const inputClass =
    size === "lg"
      ? "w-full px-5 py-4 text-lg rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      : "w-full px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputClass}
      />
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
          {results.map((book) => (
            <button
              key={book.book_id}
              onClick={() => handleSelect(book.book_id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition text-left border-b border-gray-700/50 last:border-0"
            >
              {book.cover_img ? (
                <img
                  src={book.cover_img}
                  alt=""
                  className="w-10 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-14 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-500">
                  No img
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-white font-medium truncate">{book.title}</div>
                <div className="text-gray-400 text-sm truncate">
                  {book.author}
                  {book.publication_year ? ` (${book.publication_year})` : ""}
                </div>
                {book.genres && (
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                    style={{
                      backgroundColor: (GENRE_COLORS[book.genres] || "#666") + "22",
                      color: GENRE_COLORS[book.genres] || "#999",
                    }}
                  >
                    {book.genres}
                  </span>
                )}
              </div>
              {book.rating && (
                <div className="text-yellow-400 text-sm flex-shrink-0">
                  {book.rating.toFixed(1)}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
