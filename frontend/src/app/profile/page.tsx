"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { getFollowers, getFollowing } from "@/lib/api";
import PlaylistCard from "@/components/PlaylistCard";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const { playlists, loading, fetchPlaylists } = usePlaylists();
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [tab, setTab] = useState<"playlists" | "followers" | "following">("playlists");

  useEffect(() => {
    if (!user) return;
    fetchPlaylists({ user_id: user.id });
    getFollowers().then(setFollowers);
    getFollowing().then(setFollowing);
  }, [user, fetchPlaylists]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-muted mb-4">Login to view your profile</p>
        <Link href="/login" className="text-link hover:text-link">Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{user.display_name || user.username}</h1>
        <p className="text-muted text-sm">@{user.username}</p>
        <div className="flex gap-4 mt-3 text-sm text-muted">
          <span>{playlists.length} playlists</span>
          <span>{followers.length} followers</span>
          <span>{following.length} following</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {(["playlists", "followers", "following"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium pb-1 capitalize transition ${
              tab === t ? "text-primary border-b-2 border-blue-500" : "text-muted hover:text-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "playlists" && (
        loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-strong border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="text-muted text-center py-12">No playlists yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} />
            ))}
          </div>
        )
      )}

      {tab === "followers" && (
        followers.length === 0 ? (
          <p className="text-muted text-center py-12">No followers yet</p>
        ) : (
          <div className="space-y-2">
            {followers.map((u) => (
              <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-3 bg-surface border border-line rounded-xl p-4 hover:border-strong transition">
                <div>
                  <div className="text-primary font-medium">{u.display_name || u.username}</div>
                  <div className="text-muted text-sm">@{u.username}</div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === "following" && (
        following.length === 0 ? (
          <p className="text-muted text-center py-12">Not following anyone</p>
        ) : (
          <div className="space-y-2">
            {following.map((u) => (
              <Link key={u.id} href={`/profile/${u.id}`} className="flex items-center gap-3 bg-surface border border-line rounded-xl p-4 hover:border-strong transition">
                <div>
                  <div className="text-primary font-medium">{u.display_name || u.username}</div>
                  <div className="text-muted text-sm">@{u.username}</div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
