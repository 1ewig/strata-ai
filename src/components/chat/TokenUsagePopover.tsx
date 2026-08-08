'use client';

import React, { useEffect, useRef } from 'react';
import { ModelOption } from '@/lib/models';
import {
  formatContextWindow,
  ConversationTokenMetrics,
  CumulativeUsage,
} from '@/lib/token-usage';

/** Props for the TokenUsagePopover component. */
export interface TokenUsagePopoverProps {
  modelOption: ModelOption;
  tokenUsage?: ConversationTokenMetrics | CumulativeUsage | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Clean, separated popover card detailing active context and token metrics:
 * Input tokens, Output tokens, Context Used, Context Window, and Total Token Usage.
 * Tapping or clicking anywhere outside dismisses the popover.
 */
export default function TokenUsagePopover({
  modelOption,
  tokenUsage,
  isOpen,
  onClose,
  triggerRef,
}: TokenUsagePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click/tap
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const { contextWindow } = modelOption;

  const activeMetrics = tokenUsage && 'active' in tokenUsage ? tokenUsage.active : null;
  const sessionMetrics = tokenUsage && 'session' in tokenUsage ? tokenUsage.session : null;

  const activeTokens = activeMetrics?.totalTokens ?? tokenUsage?.totalTokens ?? 0;
  const inputTokens = activeMetrics?.inputTokens ?? tokenUsage?.inputTokens ?? 0;
  const outputTokens = activeMetrics?.outputTokens ?? tokenUsage?.outputTokens ?? 0;
  const totalApiUsage = sessionMetrics?.totalApiTokens ?? activeTokens;

  const pct =
    contextWindow > 0
      ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
      : 0;

  const isNearLimit = pct >= 80;

  return (
    <>
      {/* Click-away backdrop without blur to keep header crisp */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        onTouchStart={onClose}
      />

      {/* Floating Popover Card */}
      <div
        ref={popoverRef}
        className="absolute top-14 left-3 sm:left-6 z-50 w-72 sm:w-80 bg-surface-raised border border-edge-raised rounded-2xl p-4 shadow-card-lg animate-in fade-in zoom-in-95 duration-150 text-text-primary font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-edge-default">
          <span className="text-label font-bold text-text-primary">
            Token & Context Breakdown
          </span>
        </div>

        {/* Clean Metrics List */}
        <div className="flex flex-col gap-2.5 py-3 text-caption font-mono">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Input Tokens:</span>
            <span className="text-text-primary font-semibold">
              {inputTokens.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Output Tokens:</span>
            <span className="text-text-primary font-semibold">
              {outputTokens.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Context Used:</span>
            <span
              className={`font-semibold ${isNearLimit ? 'text-warning font-bold' : 'text-text-primary'
                }`}
            >
              {activeTokens.toLocaleString()} tokens ({pct}%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Context Window:</span>
            <span className="text-text-primary font-semibold">
              {formatContextWindow(contextWindow)} ({contextWindow.toLocaleString()})
            </span>
          </div>

          <div className="pt-2 border-t border-edge-default flex items-center justify-between">
            <span className="text-text-muted">Total Token Usage:</span>
            <span className="text-primary font-bold">
              {totalApiUsage.toLocaleString()} tokens
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
