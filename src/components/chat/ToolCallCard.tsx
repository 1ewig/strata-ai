'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, XCircle } from 'lucide-react';
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
function ToolCallCard({
  label,
  icon: Icon,
  accentText,
  status,
  summary,
}: ToolCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLoading = status === 'loading';
  const isError = status === 'error';

  const statusText = isLoading ? 'loading' : isError ? 'fail' : 'success';
  const statusBadgeStyle = isLoading
    ? 'bg-surface-elevated text-text-muted'
    : isError
    ? 'bg-danger-soft text-danger font-medium'
    : 'bg-primary-soft text-primary font-medium';

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
          {/* Icon switches by status: spinner while loading, error icon on failure, unique tool icon otherwise */}
          {isLoading ? (
            <Loader2 className={`w-3.5 h-3.5 ${accentText} animate-spin shrink-0`} />
          ) : isError ? (
            <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
          )}
          <span className="font-medium text-text-primary truncate">{label}</span>
          <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded capitalize ${statusBadgeStyle}`}>
            {statusText}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-text-muted hover:text-text-primary p-0.5 transition-colors cursor-pointer"
            aria-label="Toggle details"
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded content showing minimal summary */}
      {isOpen && (
        <div className="px-3 pb-2.5 pt-1 border-t border-edge-raised/30 text-xs">
          {summary}
        </div>
      )}
    </div>
  );
}

export default React.memo(ToolCallCard);
