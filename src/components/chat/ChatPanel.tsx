'use client';

import React from 'react';
import ChatBubble from '@/components/chat/ChatBubble';
import { QuotaErrorCard } from '@/components/chat/QuotaErrorCard';
import { StrataIcon } from '@/components/ui/strata-icon';

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
  onRetryCheckQuota?: () => void;
}

export default React.memo(function ChatPanel({
  messages,
  streamingContent,
  isLoading,
  messagesEndRef,
  onOpenDrawer,
  quotaError,
  onDismissQuotaError,
  onRetryCheckQuota,
}: ChatPanelProps) {
  return (
    <div className="pt-4 space-y-4">
      {messages.length === 0 && streamingContent === null && !isLoading && !quotaError && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary border border-secondary/50 flex items-center justify-center text-surface font-semibold text-lg shadow-glow-primary">
            <StrataIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary font-display">Strata AI Workspace</h3>
          <p className="text-xs text-text-muted max-w-sm leading-relaxed">
            Ask me to create, edit, analyze, or format documents, code snippets, and markdown notes in your interactive workspace canvas!
          </p>
        </div>
      )}

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
          onRetryCheck={onRetryCheckQuota}
        />
      )}

      {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
        <div className="flex items-start gap-3.5 fade-in">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-surface shrink-0 mt-0.5 shadow-glow-primary">
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
