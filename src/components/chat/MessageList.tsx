'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { ChatMessage, ChatMetadata } from '@/lib/token-usage';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from '@/components/chat/message/ToolCallCard';
import ThoughtAccordion from '@/components/chat/message/ThoughtAccordion';
import WorkGroupCard from '@/components/chat/message/WorkGroupCard';
import CompactionDivider from '@/components/chat/message/CompactionDivider';
import MessageActionsMenu from '@/components/chat/message/MessageActionsMenu';
import UserMessageAttachments from '@/components/chat/message/UserMessageAttachments';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { flattenMessageSegments, type Segment } from '@/agent/client/segments';
import { heroItemVariants } from '@/constants/animations';

/** Elapsed inference duration timer displayed during active model generation. */
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

interface UserMessageItemProps {
  message: ChatMessage;
  segments: Segment[];
}

/** Renders a single user message turn including attachments and user bubble. */
const UserMessageItem = React.memo(function UserMessageItem({
  segments,
}: UserMessageItemProps) {
  const [activeBubbleKey, setActiveBubbleKey] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeBubbleKey && !openMenuKey) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveBubbleKey(null);
        setOpenMenuKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [activeBubbleKey, openMenuKey]);

  const handleBubbleClick = useCallback((e: React.MouseEvent, key: string) => {
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(max-width: 640px), (pointer: coarse)').matches) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], pre, code')) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    setActiveBubbleKey((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-start gap-3.5 flex-row-reverse animate-slide-up ${
        openMenuKey ? 'z-30' : ''
      }`}
    >
      {/* User Avatar */}
      <div className="hidden sm:flex relative w-8 h-8 items-center justify-center shrink-0 mt-0.5 rounded-xl bg-surface-elevated border border-edge-hover/60 text-text-primary shadow-button">
        <User className="w-4 h-4 text-text-secondary" />
      </div>

      {/* Bubble Message Content */}
      <div className="flex flex-col min-w-0 gap-2 items-end w-fit max-w-[90%] sm:max-w-[82%] ms-auto">
        {segments.map((seg) => {
          const isActionActive = openMenuKey === seg.key || activeBubbleKey === seg.key;
          const isMenuOpen = openMenuKey === seg.key;

          if (seg.type === 'user-images' && seg.images && seg.images.length > 0) {
            return <UserMessageAttachments key={seg.key} images={seg.images} />;
          }

          if (seg.type === 'user-documents' && seg.documents && seg.documents.length > 0) {
            return <UserMessageAttachments key={seg.key} documents={seg.documents} />;
          }

          if (seg.type === 'user-text') {
            const userContent = seg.content || '';
            return (
              <div
                key={seg.key}
                onClick={(e) => handleBubbleClick(e, seg.key)}
                className={`group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all duration-300 bg-primary text-surface border rounded-tr-xs shadow-card animate-slide-up w-fit max-w-full cursor-default select-none ${
                  isActionActive
                    ? 'border-primary-hover shadow-glow-primary/20'
                    : 'border-primary hover:border-primary-hover hover:shadow-glow-primary/20'
                } ${isMenuOpen ? 'z-30' : ''}`}
              >
                <div className="text-body text-surface leading-relaxed relative select-text cursor-text w-fit max-w-full">
                  <MarkdownRenderer
                    content={userContent}
                    variant="user"
                    className="text-body text-surface leading-relaxed relative select-text cursor-text"
                  />
                </div>

                {userContent && (
                  <div className="absolute inset-y-0 right-2 sm:right-3 pointer-events-none w-8 sm:w-7 flex flex-col justify-start">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky top-2 sm:top-3 -mt-2 sm:-mt-3 pointer-events-auto transition-all duration-150 ${
                        isActionActive
                          ? 'opacity-100 scale-100 z-30'
                          : 'opacity-0 scale-95 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:scale-100 group-hover/bubble:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 focus-within:pointer-events-auto z-10'
                      }`}
                    >
                      <MessageActionsMenu
                        textContent={userContent}
                        isOpen={isMenuOpen}
                        onOpenChange={(open) => setOpenMenuKey(open ? seg.key : null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
});

interface AssistantMessageItemProps {
  message: ChatMessage;
  segments: Segment[];
  isStreaming?: boolean;
}

/** Renders a single assistant turn hosting reasoning, tools, work groups, and responses. */
const AssistantMessageItem = React.memo(function AssistantMessageItem({
  message,
  segments,
  isStreaming,
}: AssistantMessageItemProps) {
  const [activeBubbleKey, setActiveBubbleKey] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeBubbleKey && !openMenuKey) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveBubbleKey(null);
        setOpenMenuKey(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [activeBubbleKey, openMenuKey]);

  const handleBubbleClick = useCallback((e: React.MouseEvent, key: string) => {
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(max-width: 640px), (pointer: coarse)').matches) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('a, button, [role="button"], pre, code')) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    setActiveBubbleKey((prev) => (prev === key ? null : key));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-start gap-3.5 fade-in ${openMenuKey ? 'z-30' : ''}`}
    >
      {/* Assistant Avatar */}
      <div className="hidden sm:flex relative w-8 h-8 items-center justify-center shrink-0 mt-0.5 transition-all duration-300">
        <StrataIcon className={`w-7 h-7 transition-transform ${isStreaming ? 'scale-105' : ''}`} />
        {isStreaming && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-ping opacity-40" />
        )}
      </div>

      {/* Bubble Message Content */}
      <div className="flex flex-col min-w-0 gap-2 items-start w-fit max-w-full">
        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;
          const isActionActive = openMenuKey === seg.key || activeBubbleKey === seg.key;
          const isMenuOpen = openMenuKey === seg.key;

          if (seg.type === 'work-group' && seg.items && seg.items.length > 0) {
            return (
              <WorkGroupCard
                key={seg.key}
                items={seg.items}
                isStreaming={isStreaming}
              />
            );
          }

          if (seg.type === 'reasoning' && seg.content) {
            return (
              <ThoughtAccordion
                key={seg.key}
                text={seg.content}
                isThinking={isStreaming && isLastSegment}
              />
            );
          }

          if (seg.type === 'tool') {
            return <ToolCallCard key={seg.key} part={seg.part} />;
          }

          if (seg.type === 'text') {
            const isStreamingActiveSegment = isStreaming && isLastSegment;
            const textContent = seg.content || '';
            const isCompacted = (message.metadata as ChatMetadata | undefined)?.isCompactedSummary === true;
            if (!textContent && !isStreamingActiveSegment && !isCompacted) {
              return null;
            }
            return (
              <div
                key={seg.key}
                onClick={(e) => !isStreamingActiveSegment && handleBubbleClick(e, seg.key)}
                className={`group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all duration-300 fade-in bg-surface-overlay/90 border text-text-primary rounded-tl-xs backdrop-blur-sm w-fit max-w-full cursor-default select-none ${
                  isActionActive
                    ? 'border-primary/60 shadow-card-lg'
                    : 'border-edge-raised hover:border-primary/60 shadow-card hover:shadow-card-lg'
                } ${isStreamingActiveSegment ? 'shadow-glow-primary' : ''} ${isMenuOpen ? 'z-30' : ''}`}
              >
                <div className="text-body text-text-primary leading-relaxed relative select-text cursor-text w-fit max-w-full">
                  <MarkdownRenderer
                    content={textContent}
                    variant="assistant"
                    isStreaming={isStreamingActiveSegment}
                    className="text-body text-text-primary leading-relaxed relative select-text cursor-text"
                  />
                </div>

                {!isStreamingActiveSegment && textContent && (
                  <div className="absolute inset-y-0 right-2 sm:right-3 pointer-events-none w-8 sm:w-7 flex flex-col justify-start">
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`sticky top-2 sm:top-3 -mt-2 sm:-mt-3 pointer-events-auto transition-all duration-150 ${
                        isActionActive
                          ? 'opacity-100 scale-100 z-30'
                          : 'opacity-0 scale-95 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:scale-100 group-hover/bubble:pointer-events-auto focus-within:opacity-100 focus-within:scale-100 focus-within:pointer-events-auto z-10'
                      }`}
                    >
                      <MessageActionsMenu
                        textContent={textContent}
                        isOpen={isMenuOpen}
                        onOpenChange={(open) => setOpenMenuKey(open ? seg.key : null)}
                      />
                    </div>
                  </div>
                )}

                {isStreamingActiveSegment && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}

        {isStreaming && <InferenceTimer />}
      </div>
    </div>
  );
});

export interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * MessageList is the unified host component that renders all conversation turns:
 * user messages, assistant bubbles, thoughts, work groups, tool cards, compaction
 * dividers, and active streaming typing indicators.
 */
function MessageList({
  messages,
  isLoading,
  messagesEndRef,
}: MessageListProps) {
  return (
    <div className="pt-4 space-y-4">
      {/* Fallback empty state if no messages exist and not loading */}
      {messages.length === 0 && !isLoading && (
        <motion.div
          variants={heroItemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-20 text-center space-y-3"
        >
          <StrataIcon className="w-12 h-12" />
          <h3 className="text-heading font-semibold text-text-primary font-display">
            Ready to help with your workspace
          </h3>
        </motion.div>
      )}

      {/* Messages rendering with compaction dividers */}
      {messages.map((message, idx) => {
        const isUser = message.role === 'user';
        const isLastAssistant = isLoading && !isUser && idx === messages.length - 1;
        const meta = message.metadata as ChatMetadata | undefined;
        const isCompacted = meta?.isCompactedSummary === true;
        const isCompactionFailed = meta?.isCompactionFailed === true;
        const segments = flattenMessageSegments(message, isLastAssistant);

        return (
          <React.Fragment key={message.id}>
            {isCompacted && <CompactionDivider label="Compaction started" />}

            {isUser ? (
              <UserMessageItem
                message={message}
                segments={segments}
              />
            ) : (
              <AssistantMessageItem
                message={message}
                segments={segments}
                isStreaming={isLastAssistant}
              />
            )}

            {isCompacted && !isLastAssistant && (
              <CompactionDivider
                label={isCompactionFailed ? 'Compaction failed' : 'Compaction completed'}
                variant={isCompactionFailed ? 'danger' : 'default'}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Standalone typing bubble before the first assistant tokens arrive */}
      {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
        <div className="flex items-start gap-3.5 fade-in">
          <div className="hidden sm:flex shrink-0 mt-0.5">
            <StrataIcon className="w-7 h-7" />
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-surface-overlay/90 border border-edge-raised flex items-center gap-1.5 backdrop-blur-sm shadow-card">
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default React.memo(MessageList);
