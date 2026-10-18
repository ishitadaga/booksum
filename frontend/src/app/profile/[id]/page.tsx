"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getFollowers, getFollowing, getPlaylists, followUser, unfollowUser } from "@/lib/api";
import PlaylistCard from "@/components/PlaylistCard";
import type { User, Playlist } from "@/lib/types";
import { API_URL } from "@/lib/constants";
import axios from "axios";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [tab, setTab] = useState<"playlists" | "followers" | "following">("playlists");
  const [loading, setLoading] = useState(true);

  const userId = Number(id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchProfile = async () => {
      try {
        const { data: user } = await axios.get(`${API_URL}/api/social/users/${userId}`);
        setProfileUser(user);

        const [playlistData, followerData, followingData] = await Promise.all([
          getPlaylists({ user_id: userId }),
          getFollowers(userId),
          getFollowing(userId),
        ]);
        setPlaylists(playlistData);
        setFollowers(followerData);
        setFollowing(followingData);

        if (currentUser) {
          const myFollowing = await getFollowing();
          setIsFollowing(myFollowing.some((u) => u.id === userId));
        }
      } catch {
        setProfileUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, userId, currentUser]);

  const handleFollow = async () => {
    try {
      await followUser(userId);
      setIsFollowing(true);
      setFollowers((prev) => [...prev, currentUser as User]);
    } catch {}
  };

  const handleUnfollow = async () => {
    try {
      await unfollowUser(userId);
      setIsFollowing(false);
      setFollowers((prev) => prev.filter((u) => u.id !== currentUser?.id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="w-8 h-8 border-2 border-strong border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-muted">User not found</p>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{profileUser.display_name || profileUser.username}</h1>
          <p className="text-muted text-sm">@{profileUser.username}</p>
          <div className="flex gap-4 mt-3 text-sm text-muted">
            <span>{playlists.length} playlists</span>
            <span>{followers.length} followers</span>
            <span>{following.length} following</span>
          </div>
        </div>
        {currentUser && !isOwnProfile && (
          isFollowing ? (
            <button
              onClick={handleUnfollow}
              className="text-sm bg-raised hover:bg-hover text-secondary px-4 py-2 rounded-lg transition"
            >
              Following
            </button>
          ) : (
            <button
              onClick={handleFollow}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Follow
            </button>
          )
        )}
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
        playlists.length === 0 ? (
          <p className="text-muted text-center py-12">No public playlists</p>
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
