"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import type { GraphResponse } from "@/lib/types";
import { getSimilarityGraph, expandGraphNode } from "@/lib/api";
import { edgeKey } from "@/lib/network";

export function useGraph() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const expansion = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); expansion.current?.abort(); }, []);

  const loadGraph = useCallback(async (bookId: string, topN = 20, minSimilarity = 0.2) => {
    request.current?.abort();
    expansion.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setExpanding(false); setError(null);
    try {
      const data = await getSimilarityGraph(bookId, topN, minSimilarity, controller.signal);
      if (!controller.signal.aborted) setGraph(data);
    } catch {
      if (!controller.signal.aborted) setError("The book map couldn’t load. The library may be waking up. Please try again.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const expandNode = useCallback(async (bookId: string, existingIds: string[], topN = 6, minSimilarity = 0.2) => {
    expansion.current?.abort();
    const controller = new AbortController();
    expansion.current = controller;
    setExpanding(true); setError(null);
    try {
      const data = await expandGraphNode(bookId, existingIds, topN, minSimilarity, controller.signal);
      if (controller.signal.aborted) return;
      setGraph(previous => {
        if (!previous) return previous;
        const nodes = new Map(previous.nodes.map(node => [node.id, node]));
        for (const node of data.nodes) if (node.id !== previous.center_book.id && !nodes.has(node.id)) nodes.set(node.id, { ...node, similarity_source: data.center_book.label });
        const edges = new Map(previous.edges.map(edge => [edgeKey(edge), edge]));
        for (const edge of data.edges) if (!edges.has(edgeKey(edge))) edges.set(edgeKey(edge), edge);
        return { center_book: previous.center_book, nodes: [...nodes.values()], edges: [...edges.values()] };
      });
    } catch {
      if (!controller.signal.aborted) setError("More connections couldn’t load. Your current map is unchanged. Please try again.");
    } finally {
      if (!controller.signal.aborted) setExpanding(false);
    }
  }, []);
  return { graph, loading, error, loadGraph, expandNode, expanding };
}
