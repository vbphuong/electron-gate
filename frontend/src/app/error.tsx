"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for client-side visibility and debugging
    console.error("Segment error caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-xl space-y-4 font-mono text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 text-red-500 mx-auto">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-base font-bold text-[var(--color-ink)]">
            Something went wrong
          </h2>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)] leading-relaxed">
            {error.message || "An unexpected error occurred in this section."}
          </p>
        </div>

        {error.digest && (
          <p className="text-[10px] text-[var(--color-ink-dim)] bg-[var(--color-paper-sub)] p-2 rounded break-all">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="atelier-btn atelier-btn-primary !py-1.5 !px-4 text-xs cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="atelier-btn atelier-btn-ghost !py-1.5 !px-4 text-xs cursor-pointer"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
