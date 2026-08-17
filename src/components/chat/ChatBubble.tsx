'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { UIMessage } from 'ai';
import { User, Loader2 } from 'lucide-react';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import WorkGroupCard from './WorkGroupCard';
import SmoothStreamText from './SmoothStreamText';
import MessageActionsMenu from './MessageActionsMenu';
import { createMarkdownComponents } from './create-markdown-components';
import { flattenMessageSegments, Segment } from '@/lib/ai/message-segments';

const REMARK_PLUGINS = [remarkGfm];

/**
 * Isolated timer component to prevent the entire ChatBubble
 * and Markdown tree from re-rendering every second during streaming.
 */
const InferenceTimer = React.memo(function InferenceTimer() {
  const [seconds, setSeconds] = useState(1);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setSeconds(Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 py-1 text-text-muted font-mono text-caption fade-in">
      <span className="font-semibold text-text-secondary">{`Working (${seconds}s)`}</span>
      <Loader2 className="w-3.5 h-3.5 text-info animate-spin shrink-0" />
    </div>
  );
});

interface ChatBubbleProps {
  message: UIMessage | { id: string; role: string; content?: string; parts?: any[] };
  isStreaming?: boolean;
  onOpenDrawer?: () => void;
}

function ChatBubble({ message, isStreaming, onOpenDrawer }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeBubbleKey, setActiveBubbleKey] = useState<string | null>(null);
  const bubbleContainerRef = useRef<HTMLDivElement | null>(null);

  // Close active mobile menu when tapping outside the bubble
  useEffect(() => {
    if (!activeBubbleKey) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (bubbleContainerRef.current && !bubbleContainerRef.current.contains(e.target as Node)) {
        setActiveBubbleKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [activeBubbleKey]);

  // Clean up copy confirmation state automatically after 2s
  useEffect(() => {
    if (!copiedCodeId) return;
    const timer = setTimeout(() => setCopiedCodeId(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedCodeId]);

  const handleCopyCodeSnippet = useCallback((codeText: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(codeText);
    }
    setCopiedCodeId(id);
  }, []);

  // Avoid toggling actions menu if the user was selecting text
  const handleBubbleClick = useCallback((key: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    setActiveBubbleKey((prev) => (prev === key ? null : key));
  }, []);

  const segments: Segment[] = React.useMemo(
    () => flattenMessageSegments(message, isStreaming),
    [message, isStreaming],
  );

  const markdownComponents = React.useMemo(
    () => createMarkdownComponents('assistant', copiedCodeId, handleCopyCodeSnippet),
    [copiedCodeId, handleCopyCodeSnippet],
  );

  const userMarkdownComponents = React.useMemo(
    () => createMarkdownComponents('user', copiedCodeId, handleCopyCodeSnippet),
    [copiedCodeId, handleCopyCodeSnippet],
  );

  return (
    <div
      ref={bubbleContainerRef}
      className={`group relative flex items-start gap-3.5 ${isUser ? 'flex-row-reverse animate-slide-up' : ''
        } ${!isUser ? 'fade-in' : ''}`}
    >
      {/* Avatar Container */}
      <div
        className={`
          hidden sm:flex relative w-8 h-8 items-center justify-center shrink-0 mt-0.5
          transition-all duration-300
          ${isUser ? 'rounded-xl bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-button' : ''}
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-text-secondary" />
        ) : (
          <StrataIcon className={`w-7 h-7 transition-transform ${isStreaming ? 'scale-105' : ''}`} />
        )}

        {!isUser && isStreaming && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping opacity-40" />
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
          const isMenuOpen = activeBubbleKey === seg.key;

          if (seg.type === 'user-text') {
            const userContent = seg.content || '';
            return (
              <div
                key={seg.key}
                onClick={() => handleBubbleClick(seg.key)}
                className={`group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all duration-300 bg-primary text-surface border rounded-tr-xs shadow-card animate-slide-up w-fit max-w-full cursor-pointer sm:cursor-default ${
                  isMenuOpen
                    ? 'border-primary-hover shadow-glow-primary/20'
                    : 'border-primary hover:border-primary-hover hover:shadow-glow-primary/20'
                }`}
              >
                {userContent && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`sticky top-2 float-right ml-2.5 -mr-1 -mt-0.5 z-10 transition-opacity duration-200 ${isMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto'
                      }`}
                  >
                    <MessageActionsMenu textContent={userContent} isUser={true} />
                  </div>
                )}
                <div className="text-body text-surface leading-relaxed relative">
                  <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={userMarkdownComponents}>
                    {userContent}
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
                onClick={() => !isStreamingActiveSegment && handleBubbleClick(seg.key)}
                className={`
                  group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed
                  transition-all duration-300 fade-in
                  bg-surface-overlay/90 border text-text-primary rounded-tl-xs
                  backdrop-blur-sm w-fit max-w-full cursor-pointer sm:cursor-default
                  ${isMenuOpen
                    ? 'border-primary/60 shadow-card-lg'
                    : 'border-edge-raised hover:border-primary/60 shadow-card hover:shadow-card-lg'
                  }
                  ${isStreamingActiveSegment ? 'shadow-glow-primary' : ''}
                `}
              >
                {!isStreamingActiveSegment && textContent && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`sticky top-2 float-right ml-2.5 -mr-1 -mt-0.5 z-10 transition-opacity duration-200 ${isMenuOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto'
                      }`}
                  >
                    <MessageActionsMenu textContent={textContent} isUser={false} />
                  </div>
                )}

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
                    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={markdownComponents}>
                      {textContent}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Inference duration timer */}
        {!isUser && isStreaming && <InferenceTimer />}
      </div>
    </div>
  );
}

export default React.memo(ChatBubble);