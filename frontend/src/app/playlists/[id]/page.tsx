"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import BookSearchBar from "@/components/BookSearchBar";
import { GENRE_COLORS } from "@/lib/constants";

export default function PlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { current, loading, fetchPlaylist, addBook, removeBook, remove } = usePlaylists();
  const [showAddBook, setShowAddBook] = useState(false);

  const playlistId = Number(params.id);

  useEffect(() => {
    if (playlistId) fetchPlaylist(playlistId);
  }, [playlistId, fetchPlaylist]);

  const handleAddBook = async (bookId: string) => {
    try {
      await addBook(playlistId, bookId);
      fetchPlaylist(playlistId);
      setShowAddBook(false);
    } catch {}
  };

  const handleRemoveBook = async (bookId: string) => {
    await removeBook(playlistId, bookId);
    fetchPlaylist(playlistId);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this playlist?")) return;
    await remove(playlistId);
    router.push("/playlists");
  };

  if (loading || !current) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = user?.id === current.user_id;
  const genreColor = GENRE_COLORS[current.genre || ""] || "#666";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{current.name}</h1>
            <p className="text-gray-400 text-sm mt-1">by {current.username}</p>
          </div>
          <div className="flex items-center gap-2">
            {current.genre && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: genreColor + "22", color: genreColor }}
              >
                {current.genre}
              </span>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-300 transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {current.description && (
          <p className="text-gray-500 text-sm mt-2">{current.description}</p>
        )}
      </div>

      {isOwner && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddBook(!showAddBook)}
            className="text-sm bg-gray-800 border border-gray-700 hover:border-gray-600 text-white px-4 py-2 rounded-lg transition"
          >
            {showAddBook ? "Cancel" : "+ Add Book"}
          </button>
          {showAddBook && (
            <div className="mt-3">
              <BookSearchBar onSelect={handleAddBook} size="sm" placeholder="Search books to add..." />
            </div>
          )}
        </div>
      )}

      {current.books.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No books in this playlist yet</p>
      ) : (
        <div className="space-y-3">
          {current.books.map((book, i) => (
            <div
              key={book.book_id}
              className="flex items-center gap-4 bg-gray-800 border border-gray-700 rounded-xl p-4"
            >
              <span className="text-gray-600 text-sm w-6 text-right flex-shrink-0">{i + 1}</span>
              {book.cover_img ? (
                <img src={book.cover_img} alt="" className="w-12 h-16 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-16 bg-gray-700 rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{book.title}</div>
                <div className="text-gray-400 text-sm truncate">{book.author}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/graph?book_id=${book.book_id}`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Similar
                </Link>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveBook(book.book_id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
