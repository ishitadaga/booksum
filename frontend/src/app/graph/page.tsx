"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import SimilarityGraph from "@/components/SimilarityGraph";
import GraphControls from "@/components/GraphControls";
import GenreLegend from "@/components/GenreLegend";
import BookDetailSidebar from "@/components/BookDetailSidebar";
import BookSearchBar from "@/components/BookSearchBar";
import { useGraph } from "@/hooks/useGraph";
import type { GraphNode } from "@/lib/types";

function GraphPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { graph, loading, error, loadGraph } = useGraph();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [topN, setTopN] = useState(20);
  const [minSimilarity, setMinSimilarity] = useState(0.3);
  const cyRef = useRef<any>(null);

  const bookId = searchParams.get("book_id");

  useEffect(() => {
    if (bookId) {
      loadGraph(bookId, topN, minSimilarity);
      setSelectedNode(null);
    }
  }, [bookId, topN, minSimilarity, loadGraph]);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (id: string) => {
      router.push(`/graph?book_id=${id}`);
    },
    [router]
  );

  const handleResetLayout = useCallback(() => {
    cyRef.current
      ?.layout({
        name: "cose-bilkent",
        animate: true,
        animationDuration: 800,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        fit: true,
        padding: 40,
      })
      .run();
  }, []);

  if (!bookId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] px-4">
        <h2 className="text-2xl text-white font-bold mb-4">Search for a book to explore</h2>
        <div className="w-full max-w-lg">
          <BookSearchBar size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Main graph area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Building similarity graph...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <div className="w-full max-w-md">
                <BookSearchBar size="sm" />
              </div>
            </div>
          </div>
        )}

        {graph && !loading && (
          <SimilarityGraph
            graph={graph}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
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
            onZoomIn={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)}
            onZoomOut={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.3)}
          />
        </div>

        {/* Legend overlay - bottom right */}
        <div className="absolute bottom-4 right-4 w-48 z-20">
          <GenreLegend />
        </div>

        {/* Graph info */}
        {graph && !selectedNode && (
          <div className="absolute top-4 right-4 z-20 bg-gray-800/80 backdrop-blur border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400">
            {graph.nodes.length} similar books &middot; {graph.edges.length} connections
          </div>
        )}

        {/* Book detail overlay */}
        <BookDetailSidebar
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onFindSimilar={handleNodeDoubleClick}
        />
      </div>

    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" /></div>}>
      <GraphPageInner />
    </Suspense>
  );
}
