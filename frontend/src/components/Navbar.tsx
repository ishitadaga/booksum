"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ThemeSelect from "./ThemeSelect";

export default function Navbar() {
  const { user, logout } = useAuth();
  const isHome = usePathname() === "/";

  return (
    <nav aria-label="Main navigation" className={`bg-canvas sticky top-0 z-50 ${isHome ? "" : "border-b border-line"}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between flex-wrap gap-x-3 gap-y-1 ${isHome ? "min-h-20 py-3" : "min-h-14 py-1"}`}>
        <div className="flex items-center gap-6">
          {!isHome && <Link href="/" className="text-xl font-bold text-primary tracking-tight">
            BookSum
          </Link>}
          <div className={`${isHome ? "flex" : "hidden sm:flex"} items-center gap-4 text-sm`}>
            <Link href="/graph" className="text-secondary hover:text-primary transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 rounded-sm">
              Explore
            </Link>
            <Link href="/playlists" className="text-secondary hover:text-primary transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 rounded-sm">
              Playlists
            </Link>
            {user && (
              <Link href="/social" className="text-secondary hover:text-primary transition">
                Social
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <ThemeSelect />
          {user ? (
            <>
              <Link href="/profile" className="text-secondary hover:text-primary transition">
                {user.display_name || user.username}
              </Link>
              <button
                onClick={logout}
                className="text-muted hover:text-primary transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-secondary hover:text-primary transition inline-flex items-center min-h-11 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 rounded-sm">
                Log in
              </Link>
              <Link
                href="/register"
                className={`inline-flex items-center min-h-11 px-3 py-1.5 rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4 ${isHome ? "border border-strong text-primary hover:bg-surface" : "bg-blue-600 text-white hover:bg-blue-700"}`}
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
