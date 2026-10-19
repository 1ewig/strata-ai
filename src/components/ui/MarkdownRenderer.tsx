'use client';

import React, { memo } from 'react';
import { Streamdown } from 'streamdown';
import { createMathPlugin } from '@streamdown/math';
import { getMarkdownComponents, MarkdownVariant } from './createMarkdownComponents';

const STREAMDOWN_ANIMATED = {
  animation: 'blurIn' as const,
  duration: 550,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  sep: 'word' as const,
  stagger: 0,
};

/**
 * singleDollarTextMath is enabled so inline math like `$E=mc^2$` renders natively
 * alongside display math `$$...$$` without requiring double dollars everywhere.
 */
const STREAMDOWN_PLUGINS = {
  math: createMathPlugin({ singleDollarTextMath: true }),
};

interface MarkdownRendererProps {
  /** The raw Markdown source to render. */
  content: string;
  /** Visual variant: assistant / user / thought / canvas token sets. */
  variant?: MarkdownVariant;
  /** When true, renders live streaming text with fluid word animation. */
  isStreaming?: boolean;
  /** Wrapper classes applied around the rendered Markdown (typography, spacing). */
  className?: string;
  /** Shows the code-block copy and download buttons. On by default. */
  enableSnippetCopy?: boolean;
}

/**
 * Centralized Markdown renderer across all surfaces (chat bubbles, workspace drawer,
 * reasoning accordions, and work-group cards). Built on Streamdown with KaTeX math
 * and Shiki highlighting.
 */
export function MarkdownRenderer({
  content,
  variant = 'assistant',
  isStreaming = false,
  className = '',
  enableSnippetCopy = true,
}: MarkdownRendererProps) {
  const components = getMarkdownComponents(variant, enableSnippetCopy);

  return (
    <div className={`w-full max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>
      <Streamdown
        mode={isStreaming ? 'streaming' : 'static'}
        isAnimating={isStreaming}
        animated={STREAMDOWN_ANIMATED}
        plugins={STREAMDOWN_PLUGINS}
        components={components}
        controls={false}
      >
        {content}
      </Streamdown>
    </div>
  );
}

export default memo(MarkdownRenderer);