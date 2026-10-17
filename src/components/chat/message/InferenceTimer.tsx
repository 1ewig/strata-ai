'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useElapsedTimer } from '@/hooks/common/useElapsedTimer';

/**
 * Elapsed inference duration timer displayed during active model generation.
 */
function InferenceTimer() {
  const { elapsedSeconds } = useElapsedTimer(true);

  return (
    <div className="flex items-center gap-1.5 py-1 text-text-muted font-mono text-caption fade-in">
      <span className="font-semibold text-text-secondary">{`Working (${elapsedSeconds}s)`}</span>
      <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
    </div>
  );
}

export default React.memo(InferenceTimer);
