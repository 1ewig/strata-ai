'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SmoothStreamTextProps {
  /** The full accumulated text of the message segment so far. */
  text: string;
  /** Whether the message is actively streaming tokens. */
  isStreaming: boolean;
  /** Custom ReactMarkdown component dictionary. */
  components?: any;
}

/**
 * Renders live streaming Markdown formatted in real-time with an active streaming caret.
 */
export function SmoothStreamText({ text, isStreaming, components }: SmoothStreamTextProps) {
  return (
    <div className="relative">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="inline-block w-[2px] h-[1.05em] ml-1 -mb-0.5 bg-primary/90 rounded-full animate-caret align-text-bottom"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default React.memo(SmoothStreamText);
