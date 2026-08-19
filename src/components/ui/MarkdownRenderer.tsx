'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SmoothStreamText from './SmoothStreamText';
import { createMarkdownComponents, MarkdownVariant } from './createMarkdownComponents';
import { useCopyClipboard } from '@/hooks/useCopyClipboard';

const REMARK_PLUGINS = [remarkGfm];

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
 * Owns the code-snippet copy state internally so copying a snippet only re-renders
 * this component, never its parent bubble or drawer.
 */
export function MarkdownRenderer({
  content,
  variant = 'assistant',
  isStreaming = false,
  className = '',
  enableSnippetCopy = false,
}: MarkdownRendererProps) {
  const { copiedId, copy } = useCopyClipboard();

  const components = useMemo(
    () =>
      createMarkdownComponents(
        variant,
        enableSnippetCopy ? copiedId : null,
        enableSnippetCopy ? (code, id) => copy(code, id) : undefined,
      ),
    [variant, copiedId, enableSnippetCopy, copy],
  );

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