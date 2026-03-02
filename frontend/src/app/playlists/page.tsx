"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import PlaylistCard from "@/components/PlaylistCard";
import { GENRES } from "@/lib/constants";

export default function PlaylistsPage() {
  const { user } = useAuth();
  const { playlists, loading, fetchPlaylists, create } = usePlaylists();
  const [selectedGenre, setSelectedGenre] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGenre, setNewGenre] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    fetchPlaylists(selectedGenre ? { genre: selectedGenre } : undefined);
  }, [selectedGenre, fetchPlaylists]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await create({ name: newName, genre: newGenre || undefined, description: newDesc || undefined });
    setNewName("");
    setNewGenre("");
    setNewDesc("");
    setShowCreate(false);
    fetchPlaylists(selectedGenre ? { genre: selectedGenre } : undefined);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Playlists</h1>
        {user && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition"
          >
            {showCreate ? "Cancel" : "Create Playlist"}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <select
            value={newGenre}
            onChange={(e) => setNewGenre(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select genre (optional)</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            type="submit"
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition"
          >
            Create
          </button>
        </form>
      )}

      {/* Genre filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedGenre(undefined)}
          className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
            !selectedGenre ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          All
        </button>
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
              selectedGenre === g ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : playlists.length === 0 ? (
        <p className="text-gray-500 text-center py-12">No playlists found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map((p) => (
            <PlaylistCard key={p.id} playlist={p} />
          ))}
        </div>
      )}
    </div>
  );
}
