"use client";

export default function GraphError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] px-4 text-center">
      <h2 className="text-xl font-bold text-primary mb-2">Graph failed to load</h2>
      <p className="text-muted mb-6 max-w-md">
        There was a problem rendering the similarity graph. This may be caused by invalid data or a network issue.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
      >
        Try again
      </button>
    </div>
  );
}
