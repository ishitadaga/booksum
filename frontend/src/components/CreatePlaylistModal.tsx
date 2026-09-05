"use client";
import { useState } from "react";
import { GENRES } from "@/lib/constants";

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; genre?: string; description?: string }) => void;
}

export default function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, genre: genre || undefined, description: description || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-line rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-primary mb-4">Create Playlist</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2 bg-raised border border-strong rounded-lg text-primary placeholder-muted focus:outline-none focus:border-blue-500 text-sm"
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full px-3 py-2 bg-raised border border-strong rounded-lg text-primary text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Select genre (optional)</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-raised border border-strong rounded-lg text-primary placeholder-muted focus:outline-none focus:border-blue-500 text-sm"
          />
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-muted hover:text-secondary px-4 py-2 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
