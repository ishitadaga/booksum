export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const GENRE_COLORS: Record<string, string> = {
  Fiction: "#4361ee",
  "Non-Fiction": "#3a86a8",
  "Mystery/Thriller": "#7b2cbf",
  "Science Fiction": "#f72585",
  Fantasy: "#4cc9f0",
  Romance: "#ff6b6b",
  Biography: "#fca311",
  History: "#8d6748",
  Science: "#2ec4b6",
  "Self-Help": "#80b918",
};

export const GENRES = Object.keys(GENRE_COLORS);
