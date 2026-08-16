'use client';

import React from 'react';
import { Globe, FileText, Compass } from 'lucide-react';
import ChatBubble from '@/components/chat/ChatBubble';
import CompactionDivider from '@/components/chat/CompactionDivider';
import { QuotaErrorCard } from '@/components/chat/QuotaErrorCard';
import { StrataIcon } from '@/components/ui/strata-icon';

/** Quick-action suggestion chips for the Dribbble-style hero empty state. */
const SUGGESTION_CHIPS = [
  {
    icon: Globe,
    label: 'Web Research',
    prompt: 'Search the web for the latest updates on AI agents and summarize key findings into a new workspace file.',
  },
  {
    icon: FileText,
    label: 'Draft Document',
    prompt: 'Create a structured project proposal document in the workspace with milestones and technical architecture.',
  },
  {
    icon: Compass,
    label: 'Analyze Workspace',
    prompt: 'List and analyze all current workspace files, providing a comprehensive executive summary.',
  },
];

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

  const handleChipClick = (promptText: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('insert-chat-prompt', { detail: promptText }));
    }
  };

  if (isNewChat) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto w-full px-2 py-4 fade-in">
        {/* Brand Icon matching Sidebar */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow-primary">
          <StrataIcon className="w-7 h-7 text-surface" />
        </div>

        {/* Hero Greeting */}
        <h2 className="text-title sm:text-display font-bold text-text-bright font-display tracking-tight">
          {welcomeMessage}
        </h2>

        {/* Quick Action Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-xl">
          {SUGGESTION_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip.prompt)}
                className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-raised/90 dark:bg-surface-elevated/90 hover:bg-surface-hover dark:hover:bg-surface-hover border border-edge-raised hover:border-primary/30 text-caption font-semibold text-text-secondary hover:text-text-bright active:scale-95 shadow-button hover:scale-[1.02] transition-all duration-150 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-primary transition-transform duration-150 group-hover:scale-110" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Composer Slot */}
        {chatInputNode && <div className="w-full text-left pt-2">{chatInputNode}</div>}

        {/* Official Engines Strip */}
        <div className="pt-2 flex flex-col items-center gap-2 text-micro text-text-muted font-medium">
          <span className="uppercase tracking-widest text-micro text-text-muted">Supported Engines</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro">Google Gemini 3.5</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro">DeepSeek V4 Flash</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro">Tavily Realtime Web</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* Fallback empty state if isNewChat flag is not explicitly passed */}
      {messages.length === 0 && !isLoading && !quotaError && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-0.5 flex items-center justify-center shadow-glow-primary">
            <div className="w-full h-full rounded-2xl bg-surface-raised flex items-center justify-center">
              <StrataIcon className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-heading font-semibold text-text-primary font-display">Ready to help with your workspace</h3>
        </div>
      )}

      {/* Messages rendering with compaction dividers */}
      {messages.map((message, idx) => {
        const isLastAssistant = isLoading && message.role === 'assistant' && idx === messages.length - 1;
        const isCompacted = message.metadata?.isCompactedSummary === true;

        return (
          <React.Fragment key={message.id}>
            {isCompacted && <CompactionDivider label="Compaction started" />}
            <ChatBubble
              message={message}
              isStreaming={isLastAssistant}
              onOpenDrawer={onOpenDrawer}
            />
            {isCompacted && !isLastAssistant && <CompactionDivider label="Compaction completed" />}
          </React.Fragment>
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
