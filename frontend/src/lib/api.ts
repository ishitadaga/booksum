import axios from "axios";
import { API_URL } from "./constants";
import type {
  BookSearchResult,
  Book,
  GraphResponse,
  AuthResponse,
  Playlist,
  PlaylistDetail,
  User,
  FeedItem,
} from "./types";

const api = axios.create({ baseURL: API_URL, withCredentials: true });

// Redirect to login on 401 (expired/invalid cookie)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/api/auth/me" &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Books
export async function searchBooks(q: string, limit = 20, signal?: AbortSignal): Promise<BookSearchResult> {
  const { data } = await api.get("/api/books/search", { params: { q, limit }, signal, timeout: 30000 });
  return data;
}

export async function getBook(bookId: string): Promise<Book> {
  const { data } = await api.get(`/api/books/${bookId}`);
  return data;
}

// Graph
export async function getSimilarityGraph(
  bookId: string,
  topN = 20,
  minSimilarity = 0.3,
  signal?: AbortSignal
): Promise<GraphResponse> {
  const { data } = await api.get("/api/graph/similarity", {
    params: { book_id: bookId, top_n: topN, min_similarity: minSimilarity },
    signal, timeout: 45000,
  });
  return data;
}

export async function expandGraphNode(
  bookId: string,
  existingIds: string[],
  topN = 10,
  minSimilarity = 0.2,
  signal?: AbortSignal
): Promise<GraphResponse> {
  const { data } = await api.get("/api/graph/similarity/expand", {
    signal, timeout: 45000,
    params: {
      book_id: bookId,
      existing_ids: existingIds.join(","),
      top_n: topN,
      min_similarity: minSimilarity,
    },
  });
  return data;
}

// Auth
export async function register(
  username: string,
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/register", {
    username,
    email,
    password,
    display_name: displayName,
  });
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/login", { username, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get("/api/auth/me");
  return data;
}

export async function logoutApi(): Promise<void> {
  await api.post("/api/auth/logout");
}

// Playlists
export async function createPlaylist(body: {
  name: string;
  genre?: string;
  description?: string;
  is_public?: boolean;
}): Promise<Playlist> {
  const { data } = await api.post("/api/playlists", body);
  return data;
}

export async function getPlaylists(params?: {
  user_id?: number;
  genre?: string;
}): Promise<Playlist[]> {
  const { data } = await api.get("/api/playlists", { params });
  return data;
}

export async function getPlaylist(id: number): Promise<PlaylistDetail> {
  const { data } = await api.get(`/api/playlists/${id}`);
  return data;
}

export async function updatePlaylist(
  id: number,
  body: { name?: string; genre?: string; description?: string; is_public?: boolean }
): Promise<Playlist> {
  const { data } = await api.put(`/api/playlists/${id}`, body);
  return data;
}

export async function deletePlaylist(id: number): Promise<void> {
  await api.delete(`/api/playlists/${id}`);
}

export async function addBookToPlaylist(playlistId: number, bookId: string): Promise<void> {
  await api.post(`/api/playlists/${playlistId}/books`, { book_id: bookId });
}

export async function removeBookFromPlaylist(playlistId: number, bookId: string): Promise<void> {
  await api.delete(`/api/playlists/${playlistId}/books/${bookId}`);
}

// Social
export async function followUser(userId: number): Promise<void> {
  await api.post(`/api/social/follow/${userId}`);
}

export async function unfollowUser(userId: number): Promise<void> {
  await api.delete(`/api/social/follow/${userId}`);
}

export async function getFollowers(userId?: number): Promise<User[]> {
  const { data } = await api.get("/api/social/followers", {
    params: userId ? { user_id: userId } : {},
  });
  return data;
}

export async function getFollowing(userId?: number): Promise<User[]> {
  const { data } = await api.get("/api/social/following", {
    params: userId ? { user_id: userId } : {},
  });
  return data;
}

export async function getFeed(): Promise<FeedItem[]> {
  const { data } = await api.get("/api/social/feed");
  return data;
}

export async function searchUsers(q: string): Promise<User[]> {
  const { data } = await api.get("/api/social/users/search", { params: { q } });
  return data;
}
