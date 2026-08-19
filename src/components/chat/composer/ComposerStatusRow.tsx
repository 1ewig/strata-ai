'use client';

import React from 'react';

/** Props for the composer status row (compacting notice, blocked banner, or textarea). */
interface ComposerStatusRowProps {
  isCompacting: boolean;
  isBlocked: boolean;
  isContextWindowExhausted: boolean;
  blockedQuotaCopy: string;
  onTriggerCompaction?: () => void;
  isLoading: boolean;
  value: string;
  placeholder: string;
  charLimit: number;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Row 1 of the composer: renders the compacting notice, the blocking warning
 * (quota or context window, with an optional "Compact history" action), or the
 * auto-growing textarea itself.
 */
function ComposerStatusRow({
  isCompacting,
  isBlocked,
  isContextWindowExhausted,
  blockedQuotaCopy,
  onTriggerCompaction,
  isLoading,
  value,
  placeholder,
  charLimit,
  onChange,
  onKeyDown,
  textareaRef,
}: ComposerStatusRowProps) {
  if (isCompacting) {
    return (
      <div className="w-full min-h-[28px] py-1 flex items-center gap-2 text-primary text-label font-medium animate-in fade-in">
        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        <span>Compacting conversation context... Please wait.</span>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="w-full min-h-[28px] py-1 flex items-center gap-2 text-danger text-caption sm:text-label font-medium animate-in fade-in flex-wrap leading-snug">
        <span>
          {isContextWindowExhausted ? 'Context window reached.' : blockedQuotaCopy}
        </span>
        {isContextWindowExhausted && onTriggerCompaction && (
          <button
            type="button"
            onClick={onTriggerCompaction}
            disabled={isLoading || isCompacting}
            className="underline hover:no-underline font-semibold cursor-pointer disabled:opacity-50 active:scale-95 transition-transform duration-150 shrink-0"
            title="Compact conversation history to reclaim context space"
          >
            Compact history
          </button>
        )}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      id="chat-input-field"
      rows={1}
      disabled={isLoading}
      maxLength={charLimit}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full bg-transparent text-text-primary placeholder-text-muted border-none text-label sm:text-body focus:outline-none resize-none min-h-[28px] max-h-48 py-1 focus:ring-0 disabled:opacity-50"
    />
  );
}

export default React.memo(ComposerStatusRow);