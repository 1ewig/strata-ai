"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { StrataIcon } from "@/components/ui/strata-icon";

/**
 * Route-level React error boundary for Next.js App Router.
 * Catches unhandled runtime errors in client and server component subtrees,
 * providing a graceful recovery UI styled with Milo design tokens.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to console for telemetry / debugging
    console.error("[Strata Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-surface-base text-text-bright flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none selection:bg-primary-soft-strong">
      <div className="w-full max-w-md p-7 sm:p-9 rounded-3xl bg-surface-raised dark:bg-surface-elevated border border-edge-raised shadow-card space-y-6">
        {/* Header Icon */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-danger-soft border border-danger/20 flex items-center justify-center shadow-button">
            <AlertTriangle className="w-6 h-6 text-danger" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary-soft border border-primary/20 flex items-center justify-center shadow-button">
            <StrataIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Heading and explanation */}
        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-title sm:text-heading text-text-bright tracking-tight">
            Something unexpected happened
          </h1>
          <p className="text-label text-text-secondary font-sans leading-relaxed">
            Strata encountered a runtime issue. Your local workspace files and conversations in IndexedDB remain safe.
          </p>
        </div>

        {/* Error Details (if available) */}
        {error.message && (
          <div className="p-3 rounded-xl bg-surface-base border border-edge-default text-left max-w-full overflow-hidden">
            <p className="text-micro font-mono text-text-muted truncate" title={error.message}>
              {error.message}
            </p>
            {error.digest && (
              <p className="text-micro font-mono text-text-faint mt-1">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:flex-1 py-2.5 px-4 bg-primary hover:bg-primary-hover active:scale-[0.98] text-surface font-semibold text-label rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-button hover:shadow-glow-primary cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:flex-1 py-2.5 px-4 bg-surface-overlay hover:bg-surface-elevated active:scale-[0.98] text-text-bright border border-edge-raised font-semibold text-label rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-button cursor-pointer"
          >
            <Home className="w-4 h-4 text-text-muted" />
            <span>Studio Home</span>
          </Link>
        </div>
      </div>

      {/* Subtle Footer Note */}
      <footer className="mt-8 text-micro font-mono text-text-muted uppercase tracking-widest">
        <span>strata®</span>
        <span className="mx-2 text-text-faint">·</span>
        <span>ERROR RECOVERY PROTOCOL</span>
      </footer>
    </div>
  );
}
