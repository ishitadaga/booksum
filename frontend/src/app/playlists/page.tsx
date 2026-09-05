"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import PlaylistCard from "@/components/PlaylistCard";
import GenreSidebar from "@/components/GenreSidebar";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";

type SortOption = "newest" | "most_books" | "a_z";

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { playlists, loading, fetchPlaylists, create } = usePlaylists();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    fetchPlaylists(selectedGenre ? { genre: selectedGenre } : undefined);
  }, [selectedGenre, fetchPlaylists]);

  const handleCreate = async (data: { name: string; genre?: string; description?: string }) => {
    await create(data);
    setShowCreate(false);
    fetchPlaylists(selectedGenre ? { genre: selectedGenre } : undefined);
  };

  const filteredAndSorted = useMemo(() => {
    let result = playlists;

    // Client-side search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(query));
    }

    // Client-side sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (b.updated_at || "").localeCompare(a.updated_at || "");
        case "most_books":
          return b.book_count - a.book_count;
        case "a_z":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [playlists, searchQuery, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Genre sidebar */}
        <GenreSidebar selected={selectedGenre} onSelect={setSelectedGenre} />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-6">
            {/* Search bar */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search playlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-surface border border-line rounded-lg text-primary placeholder-muted focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-surface border border-line rounded-lg text-secondary text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="most_books">Most Books</option>
              <option value="a_z">A–Z</option>
            </select>

            {/* Create button */}
            {user && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
              >
                Create Playlist
              </button>
            )}
          </div>

          {/* Playlist grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-strong border-t-blue-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <p className="text-muted text-center py-12">No playlists found</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAndSorted.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create playlist modal */}
      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
