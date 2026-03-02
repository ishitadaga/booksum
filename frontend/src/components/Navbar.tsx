"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            BookSum
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/graph" className="text-gray-300 hover:text-white transition">
              Graph
            </Link>
            <Link href="/playlists" className="text-gray-300 hover:text-white transition">
              Playlists
            </Link>
            {user && (
              <Link href="/social" className="text-gray-300 hover:text-white transition">
                Social
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/profile" className="text-gray-300 hover:text-white transition">
                {user.display_name || user.username}
              </Link>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-500 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
