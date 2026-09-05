"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import SimilarityGraph from "@/components/SimilarityGraph";
import type { SimilarityGraphHandle } from "@/components/SimilarityGraph";
import GraphControls from "@/components/GraphControls";
import GenreLegend from "@/components/GenreLegend";
import BookDetailSidebar from "@/components/BookDetailSidebar";
import BookSearchBar from "@/components/BookSearchBar";
import { useGraph } from "@/hooks/useGraph";
import type { GraphNode } from "@/lib/types";

function GraphPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { graph, loading, error, loadGraph, expandNode, expanding } = useGraph();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [topN, setTopN] = useState(20);
  const [minSimilarity, setMinSimilarity] = useState(0.2);
  const graphRef = useRef<SimilarityGraphHandle>(null);

  const bookId = searchParams.get("book_id");

  // Debounce slider values so dragging doesn't fire dozens of API calls
  const [debouncedTopN, setDebouncedTopN] = useState(topN);
  const [debouncedMinSim, setDebouncedMinSim] = useState(minSimilarity);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTopN(topN), 400);
    return () => clearTimeout(timer);
  }, [topN]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinSim(minSimilarity), 400);
    return () => clearTimeout(timer);
  }, [minSimilarity]);

  useEffect(() => {
    if (bookId) {
      loadGraph(bookId, debouncedTopN, debouncedMinSim);
      setSelectedNode(null);
    }
  }, [bookId, debouncedTopN, debouncedMinSim, loadGraph]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (id: string) => {
      router.push(`/graph?book_id=${encodeURIComponent(id)}`);
    },
    [router]
  );

  const handleDeselect = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleResetLayout = useCallback(() => {
    graphRef.current?.runLayout();
  }, []);

  const handleZoomIn = useCallback(() => {
    const cy = graphRef.current?.cy;
    if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  const handleZoomOut = useCallback(() => {
    const cy = graphRef.current?.cy;
    if (cy) cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  }, []);

  const handleExpandNode = useCallback(
    (nodeId: string) => {
      if (!graph) return;
      const existingIds = [graph.center_book.id, ...graph.nodes.map((n) => n.id)];
      expandNode(nodeId, existingIds, topN, minSimilarity);
    },
    [graph, expandNode, topN, minSimilarity]
  );

  if (!bookId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] px-4">
        <h2 className="text-2xl text-primary font-bold mb-4">Search for a book to explore</h2>
        <div className="w-full max-w-lg">
          <BookSearchBar size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main graph area */}
      <div className="flex-1 min-w-0 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/80 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-strong border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted">Building similarity graph...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-danger mb-4">{error}</p>
              <div className="w-full max-w-md">
                <BookSearchBar size="sm" />
              </div>
            </div>
          </div>
        )}

        {graph && !loading && (
          <SimilarityGraph
            ref={graphRef}
            graph={graph}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onDeselect={handleDeselect}
          />
        )}

        {/* Expanding overlay */}
        {expanding && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/50 z-10 pointer-events-none">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-strong border-t-green-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-secondary text-sm">Expanding graph...</p>
            </div>
          </div>
        )}

        {/* Top search bar overlay */}
        <div className="absolute top-4 left-4 right-4 max-w-md z-20">
          <BookSearchBar size="sm" placeholder="Search another book..." />
        </div>

        {/* Controls overlay - bottom left */}
        <div className="absolute bottom-4 left-4 w-52 z-20">
          <GraphControls
            topN={topN}
            setTopN={setTopN}
            minSimilarity={minSimilarity}
            setMinSimilarity={setMinSimilarity}
            onResetLayout={handleResetLayout}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>

        {/* Legend overlay - bottom right */}
        <div className="absolute top-28 sm:top-auto sm:bottom-4 right-4 w-40 sm:w-48 z-20">
          <GenreLegend />
        </div>

        {/* Graph info */}
        {graph && !selectedNode && (
          <div className="absolute top-20 lg:top-4 right-4 z-20 bg-surface/80 backdrop-blur border border-line rounded-lg px-3 py-2 text-xs text-muted">
            {graph.nodes.length} similar books &middot; {graph.edges.length} connections
          </div>
        )}

        {/* Book detail overlay */}
        <BookDetailSidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onFindSimilar={handleNodeDoubleClick}
          onExpandNode={handleExpandNode}
          isExpanding={expanding}
        />
      </div>

    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="w-12 h-12 border-4 border-strong border-t-blue-500 rounded-full animate-spin" /></div>}>
      <GraphPageInner />
    </Suspense>
  );
}
