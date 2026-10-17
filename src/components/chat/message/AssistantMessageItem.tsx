'use client';

import React from 'react';
import type { ChatMessage, ChatMetadata } from '@/lib/token-usage';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import WorkGroupCard from './WorkGroupCard';
import MessageActionsMenu from './MessageActionsMenu';
import InferenceTimer from './InferenceTimer';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import type { Segment } from '@/agent/client/segments';
import { useBubbleActionMenu } from '@/hooks';

export interface AssistantMessageItemProps {
  message: ChatMessage;
  segments: Segment[];
  isStreaming?: boolean;
}

/**
 * Renders a single assistant turn hosting reasoning, tools, work groups,
 * markdown response text, and elapsed inference duration. Pure presentational block.
 */
function AssistantMessageItem({
  message,
  segments,
  isStreaming = false,
}: AssistantMessageItemProps) {
  const {
    activeBubbleKey,
    openMenuKey,
    setOpenMenuKey,
    containerRef,
    handleBubbleClick,
  } = useBubbleActionMenu();

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
}

export default React.memo(AssistantMessageItem);
