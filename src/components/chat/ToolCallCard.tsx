'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, XCircle, ExternalLink } from 'lucide-react';
import type { ToolCardProps } from './tools/resolver';

/**
 * Card rendering a single AI tool invocation: status icon and badge in the header, plus a
 * collapsible body showing the pre-built summary and the raw arguments and result.
 * Presentation only - all display data is prepared by the resolver in `tools/resolver.tsx`.
 * @param label - Display name of the tool.
 * @param badge - Short status label shown next to the tool name (e.g. "Read", "Updated").
 * @param icon - Lucide icon component representing the tool.
 * @param accentText - Tailwind color class applied to icons and accent text.
 * @param status - Lifecycle state of the invocation: loading, success, or error.
 * @param summary - Pre-built ReactNode describing the invocation outcome, shown in the expanded body.
 * @param rawArgs - Original tool arguments, pretty-printed in the details block.
 * @param rawResult - Original tool result, pretty-printed in the details block.
 * @param onOpenDrawer - Optional callback that opens the full details drawer for successful calls.
 */
export default function ToolCallCard({
  label,
  badge,
  icon: Icon,
  accentText,
  status,
  summary,
  rawArgs,
  rawResult,
  onOpenDrawer,
}: ToolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = status === 'loading';
  const isError = status === 'error';
  // An empty object counts as "no result" so the details block can hide the Result section.
  const hasResult = rawResult != null && (typeof rawResult !== 'object' || Object.keys(rawResult as object).length > 0);

  return (
    <div className="my-1.5 rounded-lg border border-edge-raised/40 bg-surface-raised/40 hover:border-edge-raised/70 transition-all text-xs overflow-hidden fade-in relative">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />
      )}
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
        >
          {/* Icon switches by status: spinner while loading, error icon on failure, tool icon otherwise */}
          {isLoading ? (
            <Loader2 className={`w-3.5 h-3.5 ${accentText} animate-spin shrink-0`} />
          ) : isError ? (
            <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
          )}
          <span className="font-medium text-text-primary truncate">{label}</span>
          <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded ${isError ? 'bg-danger-soft text-danger' : 'bg-surface-elevated text-text-muted'}`}>
            {isLoading ? 'running...' : isError ? 'failed' : badge.toLowerCase()}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {/* "Open" action, only available for successful calls with a details drawer */}
          {onOpenDrawer && status === 'success' && (
            <button
              onClick={onOpenDrawer}
              className={`flex items-center gap-1 text-[11px] ${accentText} hover:underline cursor-pointer`}
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-muted hover:text-text-primary p-0.5 transition-colors cursor-pointer"
            aria-label="Toggle details"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-3 pt-1 border-t border-edge-raised/30 space-y-2 text-xs">
          {summary}

          {/* Raw parameters and result rendered as pretty-printed JSON */}
          <div className="mt-2 bg-surface-base/80 p-2 rounded border border-edge-raised/50 font-mono text-[10px] text-text-muted max-h-40 overflow-y-auto space-y-1.5">
            <div>
              <span className="text-text-muted font-semibold block mb-0.5">Parameters:</span>
              <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px]">
                {JSON.stringify(rawArgs, null, 2)}
              </pre>
            </div>
            {hasResult && (
              <div className="border-t border-edge-raised/40 pt-1.5">
                <span className={`${accentText} font-semibold block mb-0.5`}>Result:</span>
                <pre className="text-text-secondary whitespace-pre-wrap break-all text-[10px]">
                  {typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
