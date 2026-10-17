'use client';

import React from 'react';
import { motion } from 'motion/react';
import type { ChatMessage, ChatMetadata } from '@/lib/token-usage';
import { StrataIcon } from '@/components/ui/strata-icon';
import CompactionDivider from './CompactionDivider';
import UserMessageItem from './UserMessageItem';
import AssistantMessageItem from './AssistantMessageItem';
import { flattenMessageSegments } from '@/agent/client/segments';
import { heroItemVariants } from '@/constants/animations';

export interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * MessageList is the parent orchestrator component that coordinates all conversation turns:
 * user messages, assistant bubbles, compaction dividers, and active streaming typing indicators.
 * It passes segments and props cleanly down to child presentational components.
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
