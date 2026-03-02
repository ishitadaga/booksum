"use client";
import { useState, useCallback } from "react";
import type { Playlist, PlaylistDetail } from "@/lib/types";
import * as api from "@/lib/api";

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [current, setCurrent] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPlaylists = useCallback(async (params?: { user_id?: number; genre?: string }) => {
    setLoading(true);
    try {
      const data = await api.getPlaylists(params);
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylist = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const data = await api.getPlaylist(id);
      setCurrent(data);
    } catch {
      setCurrent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (body: { name: string; genre?: string; description?: string }) => {
      const pl = await api.createPlaylist(body);
      setPlaylists((prev) => [pl, ...prev]);
      return pl;
    },
    []
  );

  const addBook = useCallback(async (playlistId: number, bookId: string) => {
    await api.addBookToPlaylist(playlistId, bookId);
  }, []);

  const removeBook = useCallback(async (playlistId: number, bookId: string) => {
    await api.removeBookFromPlaylist(playlistId, bookId);
  }, []);

  const remove = useCallback(async (id: number) => {
    await api.deletePlaylist(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { playlists, current, loading, fetchPlaylists, fetchPlaylist, create, addBook, removeBook, remove };
}
