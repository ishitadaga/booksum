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
  const { user, loading: authLoading } = useAuth();
  const { current, loading, fetchPlaylist, addBook, removeBook, remove } = usePlaylists();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);
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
        <div className="w-8 h-8 border-2 border-strong border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isOwner = user?.id === current.user_id;
  const genreColor = GENRE_COLORS[current.genre || ""] || "#666";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Playlists
      </Link>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{current.name}</h1>
            <p className="text-muted text-sm mt-1">by {current.username}</p>
          </div>
          <div className="flex items-center gap-2">
            {current.genre && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: genreColor + "22", color: "rgb(var(--primary))" }}
              >
                {current.genre}
              </span>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-danger hover:text-danger transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {current.description && (
          <p className="text-muted text-sm mt-2">{current.description}</p>
        )}
      </div>

      {isOwner && (
        <div className="mb-6">
          <button
            onClick={() => setShowAddBook(!showAddBook)}
            className="text-sm bg-surface border border-line hover:border-strong text-primary px-4 py-2 rounded-lg transition"
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
        <p className="text-muted text-center py-12">No books in this playlist yet</p>
      ) : (
        <div className="space-y-3">
          {current.books.map((book, i) => (
            <div
              key={book.book_id}
              className="flex items-center gap-4 bg-surface border border-line rounded-xl p-4"
            >
              <span className="text-muted text-sm w-6 text-right flex-shrink-0">{i + 1}</span>
              {book.cover_img ? (
                <img src={book.cover_img} alt="" className="w-20 h-28 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-20 h-28 bg-raised rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-primary font-medium truncate">{book.title}</div>
                <div className="text-muted text-sm truncate">
                  {book.author}{book.publication_year ? ` · ${book.publication_year}` : ""}
                </div>
                {book.rating != null && (
                  <div className="text-warning text-sm mt-1">
                    <span>★</span> <span className="text-secondary">{book.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/graph?book_id=${book.book_id}`}
                  className="text-xs text-link hover:text-link transition"
                >
                  Similar
                </Link>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveBook(book.book_id)}
                    className="text-xs text-danger hover:text-danger transition"
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
