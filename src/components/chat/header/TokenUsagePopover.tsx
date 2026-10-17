'use client';

import React, { useRef } from 'react';
import type { ModelOption } from '@/lib/ai/models';
import {
  formatContextWindow,
  formatCost,
  type ConversationTokenMetrics,
} from '@/lib/ai/token-usage';
import { useClickOutside } from '@/hooks/common/useClickOutside';

export interface TokenUsagePopoverProps {
  modelOption: ModelOption;
  tokenUsage?: ConversationTokenMetrics | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  pct: number;
  isNearLimit: boolean;
  contextWindow: number;
  activeTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalApiUsage: number;
  totalCost: number;
  modelBreakdowns: ConversationTokenMetrics['modelBreakdowns'];
}

export default function TokenUsagePopover({
  isOpen,
  onClose,
  triggerRef,
  pct,
  isNearLimit,
  contextWindow,
  inputTokens,
  outputTokens,
  totalApiUsage,
  totalCost,
  modelBreakdowns = [],
}: TokenUsagePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useClickOutside(popoverRef, onClose, {
    triggerRef,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Click-away backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
        onTouchStart={onClose}
      />

      {/* Popover Card */}
      <div
        ref={popoverRef}
        className="absolute top-14 left-3 sm:left-6 z-50 w-72 bg-surface-raised border border-edge-raised rounded-xl p-3.5 shadow-card-lg animate-in fade-in zoom-in-95 duration-150 text-text-primary text-caption font-sans max-h-[85vh] overflow-y-auto space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-default">
          <span className="font-semibold text-text-primary">Token Usage</span>
          <span className="font-bold text-primary">{formatCost(totalCost)}</span>
        </div>

        {/* Visual Context Usage Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-micro text-text-muted">
            <span>Context Limit</span>
            <span className={isNearLimit ? 'text-warning font-semibold' : ''}>
              {pct}% ({formatContextWindow(contextWindow)})
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isNearLimit ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Key Metrics List */}
        <div className="space-y-1.5 font-mono text-micro">
          <div className="flex justify-between">
            <span className="text-text-muted font-sans">Input / Output</span>
            <span>
              {inputTokens.toLocaleString()} / {outputTokens.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted font-sans">Total Session Tokens</span>
            <span className="font-bold text-text-primary">
              {totalApiUsage.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        {modelBreakdowns.length > 0 && (
          <div className="pt-2 border-t border-edge-default space-y-1.5">
            <span className="text-micro font-semibold uppercase text-text-muted tracking-wider block">
              Cost Breakdown
            </span>
            <div className="space-y-1">
              {modelBreakdowns.map((m) => (
                <div key={m.modelId} className="flex items-center justify-between text-micro">
                  <span className="text-text-muted truncate max-w-[160px]" title={m.modelLabel}>
                    {m.modelLabel}
                  </span>
                  <span className="font-mono font-medium">{formatCost(m.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}