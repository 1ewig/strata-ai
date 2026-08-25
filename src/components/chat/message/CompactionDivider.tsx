'use client';

import React from 'react';

/** Props for the CompactionDivider component. */
export interface CompactionDividerProps {
  label: string;
  variant?: 'default' | 'danger';
}

/**
 * Visual horizontal rule with a centered pill label marking the boundary
 * where conversation history was compacted or where compaction failed.
 */
function CompactionDivider({ label, variant = 'default' }: CompactionDividerProps) {
  const isDanger = variant === 'danger';

  return (
    <div
      className="my-6 flex items-center justify-center relative fade-in"
      role="separator"
      aria-label={`${label} divider`}
    >
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div
          className={`w-full border-t ${
            isDanger ? 'border-danger/30 dark:border-danger/40' : 'border-edge-raised'
          }`}
        />
      </div>
      <div
        className={`relative px-3.5 py-1 rounded-full text-micro font-semibold uppercase tracking-wider shadow-button backdrop-blur-md ${
          isDanger
            ? 'bg-danger-soft/90 dark:bg-danger-soft/80 border border-danger/40 text-danger'
            : 'bg-surface-elevated/95 dark:bg-surface-elevated/90 border border-edge-raised text-text-muted dark:text-text-secondary'
        }`}
      >
        <span>{label}</span>
      </div>
    </div>
  );
}

export default React.memo(CompactionDivider);
