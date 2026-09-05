"use client";

interface Props {
  topN: number;
  setTopN: (n: number) => void;
  minSimilarity: number;
  setMinSimilarity: (n: number) => void;
  onResetLayout: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function GraphControls({
  topN,
  setTopN,
  minSimilarity,
  setMinSimilarity,
  onResetLayout,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <div className="bg-surface/80 backdrop-blur border border-line rounded-lg p-3 space-y-3">
      <div>
        <label className="text-xs text-muted block mb-1">
          Similar books: {topN}
        </label>
        <input
          aria-label="Similar books"
          type="range"
          min={5}
          max={40}
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
      <div>
        <label className="text-xs text-muted block mb-1">
          Min similarity: {minSimilarity.toFixed(2)}
        </label>
        <input
          aria-label="Minimum similarity"
          type="range"
          min={0}
          max={80}
          value={minSimilarity * 100}
          onChange={(e) => setMinSimilarity(Number(e.target.value) / 100)}
          className="w-full accent-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onZoomIn}
          className="flex-1 text-xs bg-raised hover:bg-hover text-primary min-h-11 py-1.5 rounded transition"
        >
          Zoom +
        </button>
        <button
          onClick={onZoomOut}
          className="flex-1 text-xs bg-raised hover:bg-hover text-primary min-h-11 py-1.5 rounded transition"
        >
          Zoom -
        </button>
      </div>
      <button
        onClick={onResetLayout}
        className="w-full text-xs bg-raised hover:bg-hover text-primary min-h-11 py-1.5 rounded transition"
      >
        Reset Layout
      </button>
    </div>
  );
}
