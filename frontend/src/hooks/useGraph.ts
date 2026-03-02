"use client";
import { useState, useCallback } from "react";
import type { GraphResponse } from "@/lib/types";
import { getSimilarityGraph } from "@/lib/api";

export function useGraph() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = useCallback(async (bookId: string, topN = 20, minSimilarity = 0.3) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSimilarityGraph(bookId, topN, minSimilarity);
      setGraph(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load graph");
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { graph, loading, error, loadGraph };
}
