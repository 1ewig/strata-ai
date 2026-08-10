'use client';

import React, { useEffect, useRef } from 'react';
import { ModelOption } from '@/lib/models';
import {
  formatContextWindow,
  formatCost,
  ConversationTokenMetrics,
} from '@/lib/token-usage';

export interface TokenUsagePopoverProps {
  modelOption: ModelOption;
  tokenUsage?: ConversationTokenMetrics | null;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function TokenUsagePopover({
  modelOption,
  tokenUsage,
  isOpen,
  onClose,
  triggerRef,
}: TokenUsagePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const activeTokens = tokenUsage?.active.totalTokens ?? 0;
  const inputTokens = tokenUsage?.active.inputTokens ?? 0;
  const outputTokens = tokenUsage?.active.outputTokens ?? 0;
  const totalApiUsage = tokenUsage?.session.totalApiTokens ?? activeTokens;
  const totalCost = tokenUsage?.totalCost ?? 0;
  const modelBreakdowns = tokenUsage?.modelBreakdowns ?? [];

  const pct =
    contextWindow > 0
      ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
      : 0;

  const isNearLimit = pct >= 80;

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
        className="absolute top-14 left-3 sm:left-6 z-50 w-72 bg-surface-raised border border-edge-raised rounded-xl p-3.5 shadow-lg animate-in fade-in zoom-in-95 duration-150 text-text-primary text-xs font-sans max-h-[85vh] overflow-y-auto space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-edge-default">
          <span className="font-semibold text-text-primary">Token Usage</span>
          <span className="font-bold text-primary">{formatCost(totalCost)}</span>
        </div>

        {/* Visual Context Usage Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span>Context Limit</span>
            <span className={isNearLimit ? 'text-warning font-semibold' : ''}>
              {pct}% ({formatContextWindow(contextWindow)})
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isNearLimit ? 'bg-warning' : 'bg-primary'
                }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Key Metrics List */}
        <div className="space-y-1.5 font-mono text-[11px]">
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
            <span className="text-[10px] font-semibold uppercase text-text-muted tracking-wider block">
              Cost Breakdown
            </span>
            <div className="space-y-1">
              {modelBreakdowns.map((m) => (
                <div key={m.modelId} className="flex items-center justify-between text-[11px]">
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