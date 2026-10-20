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
    openMenuKey,
    setOpenMenuKey,
    containerRef,
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

      {/* Assistant Message Content */}
      <div className="flex flex-col min-w-0 flex-1 gap-1 items-start max-w-full">
        {segments.map((seg, segIdx) => {
          const isLastSegment = segIdx === segments.length - 1;
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
            const isIntermediate = seg.isIntermediate === true || (!isLastSegment && isStreaming);
            const isStreamingActiveSegment = isStreaming && isLastSegment;
            const textContent = seg.content || '';
            const isCompacted = (message.metadata as ChatMetadata | undefined)?.isCompactedSummary === true;
            if (!textContent && !isStreamingActiveSegment && !isCompacted) {
              return null;
            }
            return (
              <div key={seg.key} className="flex flex-col items-start w-full min-w-0">
                <div
                  className={`leading-relaxed relative select-text cursor-text w-full ${
                    isIntermediate
                      ? 'text-label text-text-secondary/90 italic'
                      : 'text-body text-text-primary'
                  }`}
                >
                  <MarkdownRenderer
                    content={textContent}
                    variant={isIntermediate ? 'thought' : 'assistant'}
                    isStreaming={isStreamingActiveSegment}
                    className={`leading-relaxed relative select-text cursor-text ${
                      isIntermediate ? 'text-label text-text-secondary/90' : 'text-body text-text-primary'
                    }`}
                  />
                </div>

                {!isIntermediate && isLastSegment && !isStreaming && textContent && (
                  <div className="flex items-center justify-start gap-1 pt-1.5 pb-0.5">
                    <MessageActionsMenu
                      textContent={textContent}
                      isOpen={isMenuOpen}
                      onOpenChange={(open) => setOpenMenuKey(open ? seg.key : null)}
                      align="left"
                      direction="up"
                    />
                    {sources.length > 0 && (
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
