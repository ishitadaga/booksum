"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-900">
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">A critical error occurred. Please refresh the page.</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
