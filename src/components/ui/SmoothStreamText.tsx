'use client';

import React, { memo } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { MarkdownVariant } from './createMarkdownComponents';

interface SmoothStreamTextProps {
  /** The full accumulated text of the message segment so far. */
  text: string;
  /** Whether the message is actively streaming tokens. */
  isStreaming: boolean;
  /** Custom Markdown variant or components dictionary. */
  components?: any;
  variant?: MarkdownVariant;
  className?: string;
}

/**
 * Backwards-compatible wrapper delegating to MarkdownRenderer with Streamdown's
 * native word-level streaming animation.
 */
export function SmoothStreamText({
  text,
  isStreaming,
  variant = 'assistant',
  className = '',
}: SmoothStreamTextProps) {
  return (
    <div className="relative">
      <MarkdownRenderer
        content={text}
        isStreaming={isStreaming}
        variant={variant}
        className={className}
      />
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1.05em] ml-1 -mb-0.5 bg-primary/90 rounded-full animate-caret align-text-bottom"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default memo(SmoothStreamText);
