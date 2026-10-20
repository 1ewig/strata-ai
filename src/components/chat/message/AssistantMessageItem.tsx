'use client';

import React from 'react';
import type { ChatMessage, ChatMetadata } from '@/lib/ai/token-usage';
import { StrataIcon } from '@/components/ui/strata-icon';
import ToolCallCard from './ToolCallCard';
import ThoughtAccordion from './ThoughtAccordion';
import WorkGroupCard from './WorkGroupCard';
import MessageActionsMenu from './MessageActionsMenu';
import InferenceTimer from './InferenceTimer';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import type { Segment } from '@/agent/client/segments';
import { useBubbleActionMenu } from '@/hooks/chat/useBubbleActionMenu';
import MessageSourcesButton from './MessageSourcesButton';
import { extractWebSourcesFromMessage } from '@/lib/urls';

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

  const sources = React.useMemo(() => {
    return extractWebSourcesFromMessage(message);
  }, [message]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-start gap-3.5 fade-in ${openMenuKey ? 'z-[35]' : ''}`}
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
              <div key={seg.key} className="flex flex-col items-start gap-1 w-fit max-w-full">
                <div
                  onClick={(e) => !isStreamingActiveSegment && handleBubbleClick(e, seg.key)}
                  className={`group/bubble relative rounded-2xl px-4.5 py-3.5 text-body leading-relaxed transition-all duration-300 fade-in bg-surface-raised border text-text-primary rounded-tl-xs w-fit max-w-full cursor-default select-none ${
                    isActionActive
                      ? 'border-primary/60 shadow-card-lg'
                      : 'border-edge-raised hover:border-primary/60 shadow-card hover:shadow-card-lg'
                  } ${isStreamingActiveSegment ? 'shadow-glow-primary' : ''}`}
                >
                  <div className="text-body text-text-primary leading-relaxed relative select-text cursor-text w-fit max-w-full">
                    <MarkdownRenderer
                      content={textContent}
                      variant="assistant"
                      isStreaming={isStreamingActiveSegment}
                      className="text-body text-text-primary leading-relaxed relative select-text cursor-text"
                    />
                  </div>

                  {isStreamingActiveSegment && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/8 to-transparent" />
                    </div>
                  )}
                </div>

                {!isStreamingActiveSegment && textContent && (
                  <div className="flex items-center justify-start gap-1 px-1">
                    <MessageActionsMenu
                      textContent={textContent}
                      isOpen={isMenuOpen}
                      onOpenChange={(open) => setOpenMenuKey(open ? seg.key : null)}
                      align="left"
                      direction="down"
                    />
                    {sources.length > 0 && isLastSegment && (
                      <MessageSourcesButton sources={sources} />
                    )}
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
