"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for client-side visibility and debugging
    console.error("Global application boundary caught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#121417] text-[#f8f7f4] p-6 font-mono selection:bg-[#f05023] selection:text-white">
        <div className="max-w-md w-full p-6 rounded-xl border border-red-500/30 bg-[#1a1d21] shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-sm font-bold tracking-wide uppercase">
              System Fault · Root Enclave
            </h2>
          </div>

          <p className="text-xs text-[#7d8795] leading-relaxed">
            A critical unhandled error occurred during application rendering. The root boundary has intercepted the fault to protect system integrity.
          </p>

          {error.digest && (
            <div className="p-2.5 rounded bg-black/40 border border-white/5 font-mono text-[11px] text-[#ea580c] break-all">
              <span className="text-[#7d8795]">Digest: </span>
              {error.digest}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded text-xs font-semibold bg-[#f05023] hover:bg-[#ea580c] text-white transition-colors cursor-pointer"
            >
              Retry Pipeline
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded text-xs text-[#7d8795] hover:text-[#f8f7f4] border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
