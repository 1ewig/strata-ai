'use client';

import React from 'react';

/** Props for the CompactionDivider component. */
export interface CompactionDividerProps {
  label: string;
}

/**
 * Visual horizontal rule with a centered pill label marking the boundary
 * where conversation history was compacted.
 */
function CompactionDivider({ label }: CompactionDividerProps) {
  return (
    <div
      className="my-6 flex items-center justify-center relative fade-in"
      role="separator"
      aria-label={`${label} divider`}
    >
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-edge-raised" />
      </div>
      <div className="relative px-3.5 py-1 rounded-full bg-surface-elevated/95 dark:bg-surface-elevated/90 border border-edge-raised text-micro font-semibold uppercase tracking-wider text-text-muted dark:text-text-secondary shadow-button backdrop-blur-md">
        <span>{label}</span>
      </div>
    </div>
  );
}

export default React.memo(CompactionDivider);
