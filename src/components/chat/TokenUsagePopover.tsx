'use client';

import React, { useEffect, useRef } from 'react';
import { ModelOption } from '@/lib/models';
import {
  formatContextWindow,
  formatCost,
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
 * Input tokens, Output tokens, Context Used, Context Window, Total Token Usage,
 * Total Estimated Cost, and Per-Model Cost Breakdown.
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

  // Cost and multi-model breakdowns
  const totalCost = tokenUsage && 'totalCost' in tokenUsage ? tokenUsage.totalCost : 0;
  const modelBreakdowns =
    tokenUsage && 'modelBreakdowns' in tokenUsage ? tokenUsage.modelBreakdowns : [];

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
        className="absolute top-14 left-3 sm:left-6 z-50 w-72 sm:w-80 bg-surface-raised border border-edge-raised rounded-2xl p-4 shadow-card-lg animate-in fade-in zoom-in-95 duration-150 text-text-primary font-sans max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="pb-2.5 border-b border-edge-default">
          <span className="text-label font-bold text-text-primary">
            Token & Context Breakdown
          </span>
        </div>

        {/* Clean Metrics List */}
        <div className="flex flex-col gap-2 py-3 text-caption font-mono border-b border-edge-default">
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
              className={`font-semibold ${
                isNearLimit ? 'text-warning font-bold' : 'text-text-primary'
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

          <div className="flex items-center justify-between">
            <span className="text-text-muted">Total Token Usage:</span>
            <span className="text-primary font-bold">
              {totalApiUsage.toLocaleString()} tokens
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-edge-default/60">
            <span className="text-text-muted">Total Estimated Cost:</span>
            <span className="text-primary font-bold">
              {formatCost(totalCost)}
            </span>
          </div>
        </div>

        {/* Models Used & Cost Breakdown Section */}
        {modelBreakdowns.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-micro font-bold uppercase tracking-wider text-text-muted">
                Cost Breakdown ({modelBreakdowns.length} {modelBreakdowns.length === 1 ? 'model' : 'models'})
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {modelBreakdowns.map((m) => (
                <div
                  key={m.modelId}
                  className="bg-surface-elevated border border-edge-default/70 rounded-xl p-2.5 flex flex-col gap-1 text-micro font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-semibold text-text-primary truncate max-w-[170px]">
                      {m.modelLabel}
                    </span>
                    <span className="font-bold text-primary">
                      {formatCost(m.cost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-muted text-[11px]">
                    <span>
                      {m.turnCount} {m.turnCount === 1 ? 'turn' : 'turns'}
                    </span>
                    <span>
                      In: {m.inputTokens.toLocaleString()} · Out: {m.outputTokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
