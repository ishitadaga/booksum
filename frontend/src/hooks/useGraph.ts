"use client";
import { useState, useCallback } from "react";
import type { GraphResponse } from "@/lib/types";
import { getSimilarityGraph, expandGraphNode } from "@/lib/api";

export function useGraph() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = useCallback(async (bookId: string, topN = 20, minSimilarity = 0.2) => {
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

  const expandNode = useCallback(
    async (bookId: string, existingIds: string[], topN = 10, minSimilarity = 0.2) => {
      setExpanding(true);
      try {
        const data = await expandGraphNode(bookId, existingIds, topN, minSimilarity);

        // Use functional update to avoid stale closure over `graph`
        setGraph((prev) => {
          if (!prev) return prev;

          const existingNodeIds = new Set([
            prev.center_book.id,
            ...prev.nodes.map((n) => n.id),
          ]);
          const existingEdgeKeys = new Set(
            prev.edges.map((e) => `${e.source}-${e.target}`)
          );

          const newNodes = data.nodes.filter((n) => !existingNodeIds.has(n.id));
          const newEdges = data.edges.filter((e) => {
            const key = `${e.source}-${e.target}`;
            const reverseKey = `${e.target}-${e.source}`;
            return !existingEdgeKeys.has(key) && !existingEdgeKeys.has(reverseKey);
          });

          return {
            center_book: prev.center_book,
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
          };
        });
      } catch (e: any) {
        console.error("Failed to expand graph:", e);
      } finally {
        setExpanding(false);
      }
    },
    []
  );

  return { graph, loading, error, loadGraph, expandNode, expanding };
}
