export interface Book {
  book_id: string;
  title: string;
  author: string | null;
  description: string | null;
  genres: string | null;
  publication_year: number | null;
  isbn: string | null;
  cover_img: string | null;
  rating: number | null;
  num_ratings: number | null;
  source: string | null;
  has_embedding: boolean;
}

export interface BookSearchResult {
  books: Book[];
  total: number;
  source: string;
}

export interface GraphNode {
  id: string;
  label: string;
  author: string | null;
  genre: string | null;
  cover_img: string | null;
  similarity: number;
  is_center: boolean;
  description: string | null;
  rating: number | null;
  publication_year: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface GraphResponse {
  center_book: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  created_at: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Playlist {
  id: number;
  user_id: number;
  name: string;
  genre: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string | null;
  updated_at: string | null;
  username: string | null;
  book_count: number;
}

export interface PlaylistDetail extends Playlist {
  books: Book[];
}

export interface FeedItem {
  playlist: Playlist;
  user: User;
}
