"use client";
import { useState, useEffect } from "react";
import type { Book } from "@/lib/types";
import { searchBooks } from "@/lib/api";

export function useBookSearch(debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const searchQuery = query.trim();

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setResolvedQuery(searchQuery);
      return;
    }

    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await searchBooks(searchQuery, 10, controller.signal);
        if (current) setResults(data.books);
      } catch {
        if (current) {
          setResults([]);
          setError("We couldn’t reach the library. Please try again.");
        }
      } finally {
        if (current) {
          setResolvedQuery(searchQuery);
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchQuery, debounceMs, attempt]);

  return {
    query, setQuery,
    results: resolvedQuery === searchQuery ? results : [],
    loading: searchQuery.length >= 2 && (loading || resolvedQuery !== searchQuery),
    error: resolvedQuery === searchQuery ? error : null,
    retry: () => setAttempt(value => value + 1),
  };
}
