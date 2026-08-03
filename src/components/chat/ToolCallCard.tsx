'use client';

import React, { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Loader2, XCircle, type LucideIcon } from 'lucide-react';
import { resolveToolDisplay, type ToolCardProps } from './tools/resolver';

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
interface ToolCallCardProps {
  part?: any;
  onOpenDrawer?: () => void;
  label?: string;
  icon?: LucideIcon;
  accentText?: string;
  status?: 'loading' | 'success' | 'error';
  summary?: ReactNode;
}

function ToolCallCard({
  part,
  onOpenDrawer,
  label: explicitLabel,
  icon: ExplicitIcon,
  accentText: explicitAccentText,
  status: explicitStatus,
  summary: explicitSummary,
}: ToolCallCardProps) {
  const resolved = React.useMemo(() => {
    if (part) {
      return resolveToolDisplay(part, onOpenDrawer);
    }
    return null;
  }, [part, onOpenDrawer]);

  const label = resolved?.label || explicitLabel || 'Tool Call';
  const Icon = resolved?.icon;
  const accentText = resolved?.accentText || explicitAccentText || 'text-info';
  const status = resolved?.status || explicitStatus || 'success';
  const summary = resolved?.summary || explicitSummary;

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
    <div className="my-1.5 rounded-2xl border border-edge-raised/40 bg-surface-raised/40 hover:border-edge-raised/70 transition-all text-caption overflow-hidden fade-in relative">
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
          ) : Icon ? (
            <Icon className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
          ) : ExplicitIcon ? (
            <ExplicitIcon className={`w-3.5 h-3.5 ${accentText} shrink-0`} />
          ) : null}
          <span className="font-medium text-text-primary truncate">{label}</span>
          <span className={`text-micro font-mono shrink-0 px-1.5 py-0.5 rounded-lg capitalize ${statusBadgeStyle}`}>
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
        <div className="px-3 pb-2.5 pt-1 border-t border-edge-raised/30 text-caption">
          {summary}
        </div>
      )}
    </div>
  );
}

/**
 * Custom props comparator for React.memo(ToolCallCard) that prevents main-thread re-renders
 * while multi-kilobyte file argument strings (e.g. writeFile / editFile content) stream in.
 */
function areToolCallCardPropsEqual(prevProps: ToolCallCardProps, nextProps: ToolCallCardProps): boolean {
  if (prevProps.onOpenDrawer !== nextProps.onOpenDrawer) return false;
  if (prevProps.label !== nextProps.label || prevProps.status !== nextProps.status) return false;

  const prevPart = prevProps.part;
  const nextPart = nextProps.part;

  if (!prevPart && !nextPart) return true;
  if (!prevPart || !nextPart) return false;

  const prevInv = prevPart.toolInvocation || prevPart;
  const nextInv = nextPart.toolInvocation || nextPart;

  const prevId = prevInv.toolCallId || prevInv.id || prevPart.id;
  const nextId = nextInv.toolCallId || nextInv.id || nextPart.id;
  if (prevId !== nextId) return false;

  const prevState = prevInv.state || prevPart.state;
  const nextState = nextInv.state || nextPart.state;
  if (prevState !== nextState) return false;

  const prevName = prevInv.toolName || prevInv.name || prevPart.toolName;
  const nextName = nextInv.toolName || nextInv.name || nextPart.toolName;
  if (prevName !== nextName) return false;

  // On terminal states (output-available or result), re-render if success or error output changes.
  if (nextState === 'output-available' || nextState === 'result') {
    const prevRes = prevInv.result || prevInv.output;
    const nextRes = nextInv.result || nextInv.output;
    if (prevRes?.success !== nextRes?.success || prevRes?.error !== nextRes?.error) return false;
  }

  // During active streaming/loading state, skip re-renders caused by growing args/input strings!
  return true;
}

export default React.memo(ToolCallCard, areToolCallCardPropsEqual);
