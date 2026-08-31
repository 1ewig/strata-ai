"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { StrataIcon } from "@/components/ui/strata-icon";
import "./globals.css";

/**
 * Root global error boundary for Next.js App Router.
 * Catches fatal errors occurring in the root layout shell.
 * Must render its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Strata Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-base text-text-primary antialiased font-sans min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
        <div className="w-full max-w-md p-7 sm:p-9 rounded-3xl bg-surface-raised border border-edge-raised shadow-card space-y-6">
          {/* Header Icon */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-danger-soft border border-danger/20 flex items-center justify-center shadow-button">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-soft border border-primary/20 flex items-center justify-center shadow-button">
              <StrataIcon className="w-6 h-6" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-title text-text-bright tracking-tight">
              Application Error
            </h1>
            <p className="text-label text-text-secondary leading-relaxed">
              A critical error occurred while initializing the application shell.
            </p>
          </div>

          {/* Error Message */}
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

          {/* Reload Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover active:scale-[0.98] text-surface font-semibold text-label rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-button hover:shadow-glow-primary cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
