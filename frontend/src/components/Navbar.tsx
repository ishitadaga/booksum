"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const isHome = usePathname() === "/";

  return (
    <nav aria-label="Main navigation" className={`bg-gray-900 sticky top-0 z-50 ${isHome ? "" : "border-b border-gray-800"}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between ${isHome ? "min-h-20 py-3 flex-wrap gap-3" : "h-14"}`}>
        <div className="flex items-center gap-6">
          {!isHome && <Link href="/" className="text-xl font-bold text-white tracking-tight">
            BookSum
          </Link>}
          <div className={`${isHome ? "flex" : "hidden sm:flex"} items-center gap-4 text-sm`}>
            <Link href="/graph" className="text-gray-300 hover:text-white transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 focus-visible:outline-offset-4 rounded-sm">
              Explore
            </Link>
            <Link href="/playlists" className="text-gray-300 hover:text-white transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 focus-visible:outline-offset-4 rounded-sm">
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
              <Link href="/login" className="text-gray-300 hover:text-white transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 focus-visible:outline-offset-4 rounded-sm">
                Log in
              </Link>
              <Link
                href="/register"
                className={`inline-flex items-center min-h-11 px-3 py-1.5 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 focus-visible:outline-offset-4 ${isHome ? "border border-gray-600 text-gray-200 hover:bg-gray-800" : "bg-blue-600 text-white hover:bg-blue-500"}`}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
