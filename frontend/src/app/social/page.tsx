"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getFeed, searchUsers, followUser, unfollowUser, getFollowing } from "@/lib/api";
import PlaylistCard from "@/components/PlaylistCard";
import type { FeedItem, User } from "@/lib/types";
import Link from "next/link";

export default function SocialPage() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"feed" | "discover">("feed");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getFeed(), getFollowing()])
      .then(([feedData, followingData]) => {
        setFeed(feedData);
        setFollowingIds(new Set(followingData.map((u) => u.id)));
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchUsers(searchQuery);
      setSearchResults(results.filter((u) => u.id !== user?.id));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleFollow = async (userId: number) => {
    try {
      await followUser(userId);
      setFollowingIds((prev) => new Set([...prev, userId]));
    } catch {}
  };

  const handleUnfollow = async (userId: number) => {
    try {
      await unfollowUser(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch {}
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-muted mb-4">Login to see your social feed</p>
        <Link href="/login" className="text-link hover:text-link">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setTab("feed")}
          className={`text-sm font-medium pb-1 transition ${
            tab === "feed" ? "text-primary border-b-2 border-blue-500" : "text-muted hover:text-secondary"
          }`}
        >
          Feed
        </button>
        <button
          onClick={() => setTab("discover")}
          className={`text-sm font-medium pb-1 transition ${
            tab === "discover" ? "text-primary border-b-2 border-blue-500" : "text-muted hover:text-secondary"
          }`}
        >
          Discover People
        </button>
      </div>

      {tab === "feed" ? (
        loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-strong border-t-blue-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted mb-2">No playlists in your feed yet</p>
            <p className="text-muted text-sm">Follow people to see their playlists here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((item) => (
              <div key={item.playlist.id}>
                <p className="text-muted text-xs mb-2">
                  {item.user.display_name || item.user.username} shared a playlist
                </p>
                <PlaylistCard playlist={item.playlist} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div>
          <input
            type="text"
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-surface border border-line rounded-lg text-primary placeholder-muted focus:outline-none focus:border-blue-500 mb-4"
          />
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-surface border border-line rounded-xl p-4"
                >
                  <div>
                    <div className="text-primary font-medium">{u.display_name || u.username}</div>
                    <div className="text-muted text-sm">@{u.username}</div>
                  </div>
                  {followingIds.has(u.id) ? (
                    <button
                      onClick={() => handleUnfollow(u.id)}
                      className="text-xs bg-raised hover:bg-hover text-secondary px-3 py-1.5 rounded-lg transition"
                    >
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFollow(u.id)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      Follow
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
