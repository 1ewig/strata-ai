'use client';

import React, { useState, useRef } from 'react';
import { MODELS } from '@/lib/models';
import { NEAR_LIMIT_PERCENT } from '@/lib/limits';
import {
  formatContextWindow,
  formatTokens,
  ConversationTokenMetrics,
} from '@/lib/token-usage';
import TokenUsagePopover from './TokenUsagePopover';

/** Props for the ContextWindowIndicator component. */
export interface ContextWindowIndicatorProps {
  title?: string;
  model?: string;
  tokenUsage?: ConversationTokenMetrics | null;
}

/**
 * Conversation title paired with the active context window indicator badge and its
 * separated hover/tap details popover.
 */
export default function ContextWindowIndicator({
  title,
  model,
  tokenUsage,
}: ContextWindowIndicatorProps) {
  // Context window popover state (desktop click/hover & mobile tap)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const modelOption = React.useMemo(() => {
    return MODELS.find((m) => m.id === model) || MODELS[0];
  }, [model]);

  const { contextWindow } = modelOption;

  // Resolve active context window tokens
  const activeTokens = tokenUsage?.active.totalTokens ?? 0;

  const pct =
    contextWindow > 0
      ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
      : 0;

  const isNearLimit = pct >= NEAR_LIMIT_PERCENT;

  const togglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  return (
    <>
      {/* Conversation title & active context window indicator */}
      <div className="flex flex-col min-w-0">
        <span className="text-label font-semibold text-text-primary truncate max-w-[160px] sm:max-w-md">
          {title || 'Chat Workspace'}
        </span>

        {/* Interactive Context Window Button (Click/hover on desktop, tap on mobile) */}
        <button
          ref={triggerRef}
          type="button"
          onClick={togglePopover}
          className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-lg hover:bg-surface-hover/80 active:scale-[0.98] text-left transition-all duration-150 cursor-pointer group max-w-[220px] sm:max-w-xs"
          title="Click or tap to view token usage and context window details"
          aria-label="View token usage details"
          aria-expanded={isPopoverOpen}
        >
          <span
            className={`text-micro font-mono truncate leading-none transition-colors ${
              isNearLimit
                ? 'text-warning font-medium'
                : 'text-text-muted group-hover:text-text-primary'
            }`}
          >
            Context window: {formatTokens(activeTokens)} / {formatContextWindow(contextWindow)}
          </span>
        </button>
      </div>

      {/* Separated Clean Token Usage Popover */}
      <TokenUsagePopover
        modelOption={modelOption}
        tokenUsage={tokenUsage}
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
