'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { User } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import WorkGroupCard from './WorkGroupCard';
import SmoothStreamText from './SmoothStreamText';
import { createMarkdownComponents } from './create-markdown-components';
import { flattenMessageSegments, Segment } from '@/lib/ai/message-segments';

/** Props for the ChatBubble message component. */
interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

/**
 * Renders a single chat message as a bubble row: avatar, optional streaming
 * states, markdown body, thinking accordions, and tool call cards.
 *
 * @param message - The message to render; user text is pulled from `parts`,
 *   assistant content is split into text/reasoning/tool segments.
 * @param isStreaming - True for the in-flight assistant message; drives glow,
 *   shimmer, caret, and thinking animations.
 * @param onOpenDrawer - Opens the workspace file drawer from tool call cards.
 */
function ChatBubble({ message, isStreaming, onOpenDrawer }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(1);

  // Live timer tracking the in-flight inference duration
  useEffect(() => {
    if (!isStreaming) {
      startTimeRef.current = null;
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const seconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setElapsedSeconds(seconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  /**
   * Copies a code snippet to the clipboard and flashes a temporary "Copied"
   * confirmation on the matching snippet button.
   *
   * @param codeText - The raw code to copy.
   * @param id - The snippet id used to highlight the button that was clicked.
   */
  const handleCopyCodeSnippet = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Flatten the raw message into render-ready segments (user text, markdown
  // text, reasoning, tool invocations, grouped work items) so each part can be
  // rendered by its own sub-component below.
  const segments: Segment[] = React.useMemo(
    () => flattenMessageSegments(message, isStreaming),
    [message, isStreaming],
  );

  // Memoize custom markdown components so ReactMarkdown does not tear down DOM nodes on every token render.
  const markdownComponents = React.useMemo(
    () => createMarkdownComponents('assistant', copiedCodeId, handleCopyCodeSnippet),
    [copiedCodeId],
  );

  // Memoize user-specific markdown components styled for the solid primary background.
  const userMarkdownComponents = React.useMemo(
    () => createMarkdownComponents('user', copiedCodeId, handleCopyCodeSnippet),
    [copiedCodeId],
  );

  return (
    <div
      className={`group relative flex items-start gap-3.5 ${isUser ? 'flex-row-reverse animate-slide-up' : ''
        } ${!isUser ? 'fade-in' : ''}`}
    >
      {/* Avatar Container: hidden on mobile (< sm) to give messages maximum width */}
      <div
        className={`
          hidden sm:flex relative w-8 h-8 rounded-xl items-center justify-center text-label font-semibold shrink-0 mt-0.5
          transition-all duration-500
          ${isUser
            ? 'bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-sm'
            : `bg-gradient-to-tr from-primary to-secondary text-surface
                 ${isStreaming ? 'shadow-glow-primary scale-[1.03]' : 'shadow-card'}`
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-text-secondary" />
        ) : (
          <StrataIcon className="w-4.5 h-4.5 text-surface" />
        )}

        {!isUser && isStreaming && (
          <span className="absolute inset-0 rounded-xl ring-2 ring-primary/40 animate-ping opacity-40" />
        )}
      </div>

      <div
        className={`
          flex flex-col min-w-0 gap-2
          ${isUser ? 'items-end w-fit max-w-[90%] sm:max-w-[82%] ms-auto' : 'items-start w-fit max-w-full'}
        `}
      >
        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;

          if (seg.type === 'user-text') {
            return (
              <div
                key={seg.key}
                className="relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all bg-primary text-surface border border-primary rounded-tr-xs shadow-card animate-slide-up w-fit max-w-full"
              >
                <div className="text-body text-surface leading-relaxed relative">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={userMarkdownComponents}>
                    {seg.content || ''}
                  </ReactMarkdown>
                </div>
              </div>
            );
          }

          if (seg.type === 'work-group' && seg.items && seg.items.length > 0) {
            return (
              <WorkGroupCard
                key={seg.key}
                items={seg.items}
                isStreaming={isStreaming}
                onOpenDrawer={onOpenDrawer}
              />
            );
          }

          if (seg.type === 'reasoning' && seg.content) {
            return <ThoughtAccordion key={seg.key} text={seg.content} isThinking={isStreaming && isLastSegment} />;
          }

          if (seg.type === 'tool') {
            return <ToolCallCard key={seg.key} part={seg.part} onOpenDrawer={onOpenDrawer} />;
          }

          if (seg.type === 'text') {
            const isStreamingActiveSegment = isStreaming && isLastSegment;
            const textContent = seg.content || '';
            const isCompacted = (message as any).metadata?.isCompactedSummary === true;
            if (!textContent && !isStreamingActiveSegment && !isCompacted) {
              return null;
            }
            return (
              <div
                key={seg.key}
                className={`
                  relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed
                  transition-all duration-300 fade-in
                  bg-surface-overlay/90 border border-edge-raised text-text-primary rounded-tl-xs
                  shadow-md backdrop-blur-sm w-fit max-w-full
                  ${isStreamingActiveSegment ? 'shadow-glow-primary' : ''}
                `}
              >
                {/* Streaming glow: shimmer sweep across the newest text bubble */}
                {isStreamingActiveSegment && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
                  </div>
                )}

                <div className="text-body text-text-primary leading-relaxed relative">
                  {isStreamingActiveSegment ? (
                    <SmoothStreamText
                      text={textContent}
                      isStreaming={true}
                      components={markdownComponents}
                    />
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {textContent}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Constant working state visible below streaming parts until inference finishes */}
        {!isUser && isStreaming && (
          <div className="flex items-center py-1 text-text-muted font-mono text-caption fade-in">
            <span className="font-semibold text-text-secondary">
              {`Working (${elapsedSeconds}s)...`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ChatBubble);