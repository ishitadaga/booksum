"use client";
import BookSearchBar from "@/components/BookSearchBar";
import { GENRE_COLORS } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center px-4 pt-24 pb-16">
      <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 text-center">
        Discover Similar Books
      </h1>
      <p className="text-gray-400 text-lg mb-10 text-center max-w-xl">
        Search for any book and explore an interactive similarity graph.
        Create playlists and share with friends.
      </p>

      <div className="w-full max-w-2xl mb-16">
        <BookSearchBar autoFocus size="lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl w-full">
        {Object.entries(GENRE_COLORS).map(([genre, color]) => (
          <div
            key={genre}
            className="text-center px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: color + "15", color }}
          >
            {genre}
          </div>
        ))}
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl w-full text-center">
        <div>
          <div className="text-3xl mb-2">&#x1F4D6;</div>
          <h3 className="text-white font-semibold mb-1">Similarity Graph</h3>
          <p className="text-gray-500 text-sm">
            Explore connections between books with an interactive force-directed graph
          </p>
        </div>
        <div>
          <div className="text-3xl mb-2">&#x1F3B5;</div>
          <h3 className="text-white font-semibold mb-1">Book Playlists</h3>
          <p className="text-gray-500 text-sm">
            Create Spotify-like playlists of your favorite books organized by genre
          </p>
        </div>
        <div>
          <div className="text-3xl mb-2">&#x1F465;</div>
          <h3 className="text-white font-semibold mb-1">Social Features</h3>
          <p className="text-gray-500 text-sm">
            Follow friends, share playlists, and discover what others are reading
          </p>
        </div>
      </div>
    </div>
  );
}
