'use client';

import React, { useState, useRef } from 'react';
import {
  formatContextWindow,
  formatTokens,
  type ConversationTokenMetrics,
} from '@/lib/ai/token-usage';
import TokenUsagePopover from './TokenUsagePopover';
import { useContextWindowMetrics } from '@/hooks';

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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const metrics = useContextWindowMetrics(model, tokenUsage);
  const { modelOption, contextWindow, activeTokens, pct, isNearLimit } = metrics;

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
        pct={pct}
        isNearLimit={isNearLimit}
        contextWindow={contextWindow}
        activeTokens={activeTokens}
        inputTokens={metrics.inputTokens}
        outputTokens={metrics.outputTokens}
        totalApiUsage={metrics.totalApiUsage}
        totalCost={metrics.totalCost}
        modelBreakdowns={metrics.modelBreakdowns}
      />
    </>
  );
}
