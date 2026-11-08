import React from "react";

export interface LoadingScreenProps {
  /** Optional status caption shown below the spinner. */
  message?: string;
  /** Additional styling applied to the outer container. */
  className?: string;
}

/**
 * Minimal full-screen loading state shown while authentication state,
 * page transitions, or the active workspace resolve.
 * Neutral CSS-only spinner with an optional caption, styled with
 * semantic design tokens — no client JS required.
 */
export function LoadingScreen({ message, className = "" }: LoadingScreenProps) {
  return (
    <div
      className={`min-h-dvh bg-surface-base flex flex-col items-center justify-center gap-3 p-6 select-none ${className}`}
    >
      <div
        className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      />
      {message && (
        <p className="text-caption font-sans text-text-muted">{message}</p>
      )}
    </div>
  );
}

export default LoadingScreen;
