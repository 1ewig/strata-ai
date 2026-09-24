'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SmoothStreamText from './SmoothStreamText';
import { getMarkdownComponents, MarkdownVariant } from './createMarkdownComponents';

export const REMARK_PLUGINS = [remarkGfm];

interface MarkdownRendererProps {
  /** The raw Markdown source to render. */
  content: string;
  /** Visual variant: assistant / user / thought / canvas token sets. */
  variant?: MarkdownVariant;
  /** When true, renders live streaming text (progressive caret) instead of a full parse. */
  isStreaming?: boolean;
  /** Wrapper classes applied around the rendered Markdown (typography, spacing). */
  className?: string;
  /** Shows the code-block copy button. Off by default to preserve canvas-only behavior. */
  enableSnippetCopy?: boolean;
}

/**
 * Single reusable Markdown renderer for every surface in the app (chat bubbles,
 * workspace canvas preview, reasoning accordions, work-group narration).
 *
 * Uses statically cached component dictionaries per variant to avoid React DOM
 * node reconstruction during streaming.
 */
export function MarkdownRenderer({
  content,
  variant = 'assistant',
  isStreaming = false,
  className = '',
  enableSnippetCopy = false,
}: MarkdownRendererProps) {
  const components = getMarkdownComponents(variant, enableSnippetCopy);

  if (isStreaming) {
    return (
      <div className={className}>
        <SmoothStreamText text={content} isStreaming={true} components={components} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default React.memo(MarkdownRenderer);