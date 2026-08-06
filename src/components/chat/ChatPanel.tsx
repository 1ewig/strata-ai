'use client';

import React from 'react';
import ChatBubble from '@/components/chat/ChatBubble';
import { QuotaErrorCard } from '@/components/chat/QuotaErrorCard';
import { StrataIcon } from '@/components/ui/strata-icon';

/** Pool of short, engaging welcome greetings for new chats. */
export const WELCOME_MESSAGES = [
  "What would you like to build or edit today?",
  "How can I help with your workspace today?",
  "What are we working on today?",
  "Ready to create, edit, or analyze your files.",
  "What would you like to research or draft?",
  "How can Strata AI assist your workspace today?",
];

/** Props for the ChatPanel message list orchestrator. */
interface ChatPanelProps {
  messages: any[];
  streamingContent: string | null;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onOpenDrawer?: () => void;
  quotaError?: {
    message: string;
    retryAfter?: number;
  } | null;
  onDismissQuotaError?: () => void;
  chatId?: string;
  isNewChat?: boolean;
  chatInputNode?: React.ReactNode;
}

/**
 * Orchestrates the chat message area: an empty-state hero, the message
 * bubbles, a quota error card, a typing indicator, and the scroll anchor.
 *
 * @param messages - Conversation messages rendered as ChatBubble rows.
 * @param streamingContent - In-flight assistant text; suppresses the empty state
 *   while a response is being generated.
 * @param isLoading - Shows the typing indicator while the assistant responds.
 * @param messagesEndRef - Scroll anchor appended after the last message.
 * @param onOpenDrawer - Passed through to bubbles for tool card drawer actions.
 * @param quotaError - Quota exhaustion banner shown above the composer.
 * @param onDismissQuotaError - Dismisses the quota error card when called.
 * @param chatId - Active conversation ID used to pick a stable welcome greeting.
 * @param isNewChat - True when no messages exist, centering the composer in the hero.
 * @param chatInputNode - The ChatInput node rendered in the centered hero.
 */
export default React.memo(function ChatPanel({
  messages,
  streamingContent,
  isLoading,
  messagesEndRef,
  onOpenDrawer,
  quotaError,
  onDismissQuotaError,
  chatId,
  isNewChat,
  chatInputNode,
}: ChatPanelProps) {
  // Pick a stable welcome message from the pool based on the conversation ID
  const welcomeMessage = React.useMemo(() => {
    if (!chatId) return WELCOME_MESSAGES[0];
    let hash = 0;
    for (let i = 0; i < chatId.length; i++) {
      hash = (hash << 5) - hash + chatId.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % WELCOME_MESSAGES.length;
    return WELCOME_MESSAGES[index];
  }, [chatId]);

  if (isNewChat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 max-w-2xl mx-auto w-full px-2 pt-12 fade-in">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary border border-secondary/50 flex items-center justify-center text-surface font-semibold text-heading shadow-glow-primary">
          <StrataIcon className="w-6 h-6 text-surface" />
        </div>
        <h2 className="text-heading sm:text-title font-semibold text-text-primary font-display tracking-tight">
          {welcomeMessage}
        </h2>
        {chatInputNode && <div className="w-full text-left pt-2">{chatInputNode}</div>}
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* Fallback empty state if isNewChat flag is not explicitly passed */}
      {messages.length === 0 && streamingContent === null && !isLoading && !quotaError && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary border border-secondary/50 flex items-center justify-center text-surface font-semibold text-heading shadow-glow-primary">
            <StrataIcon className="w-6 h-6" />
          </div>
          <h3 className="text-heading font-semibold text-text-primary font-display">{welcomeMessage}</h3>
        </div>
      )}

      {/* Only the final assistant message gets streaming effects while loading. */}
      {messages.map((message, idx) => {
        const isLastAssistant = isLoading && message.role === 'assistant' && idx === messages.length - 1;
        return (
          <ChatBubble
            key={message.id}
            message={message}
            isStreaming={isLastAssistant}
            onOpenDrawer={onOpenDrawer}
          />
        );
      })}

      {quotaError && (
        <QuotaErrorCard
          key={`${quotaError.retryAfter ?? 0}-${quotaError.message}`}
          error={quotaError}
          onDismiss={onDismissQuotaError}
        />
      )}

      {/* Standalone typing bubble before the first assistant tokens arrive. */}
      {!quotaError && isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
        <div className="flex items-start gap-3.5 fade-in">
          <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary items-center justify-center text-surface shrink-0 mt-0.5 shadow-glow-primary">
            <StrataIcon className="w-4.5 h-4.5" />
          </div>
          <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-surface-overlay/90 border border-edge-raised flex items-center gap-1.5 backdrop-blur-sm">
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});
