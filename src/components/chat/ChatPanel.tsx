'use client';

import React from 'react';
import { Globe, FileText, Compass } from 'lucide-react';
import { motion } from 'motion/react';
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
      <motion.div
        key={chatId || 'new-chat-hero'}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
              delayChildren: 0.02,
            },
          },
        }}
        className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto w-full px-2 py-4"
      >
        {/* Brand Icon matching Sidebar with spring pop and ambient glow */}
        <motion.div
          variants={{
            hidden: { scale: 0.5, opacity: 0, rotate: -12 },
            visible: {
              scale: 1,
              opacity: 1,
              rotate: 0,
              transition: { type: 'spring', stiffness: 400, damping: 20 },
            },
          }}
          className="relative group"
        >
          <StrataIcon className="w-14 h-14 transition-transform duration-300 group-hover:scale-105" />
          {/* Subtle ambient decorative glow */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary/25 to-secondary/25 blur-md -z-10 animate-pulse" />
        </motion.div>

        {/* Hero Greeting */}
        <motion.h2
          variants={{
            hidden: { y: 18, opacity: 0 },
            visible: {
              y: 0,
              opacity: 1,
              transition: { type: 'spring', stiffness: 360, damping: 26 },
            },
          }}
          className="text-title sm:text-display font-bold text-text-bright font-display tracking-tight"
        >
          {welcomeMessage}
        </motion.h2>

        {/* Quick Action Suggestion Chips */}
        <motion.div
          variants={{
            hidden: { y: 12, opacity: 0 },
            visible: {
              y: 0,
              opacity: 1,
              transition: {
                type: 'spring',
                stiffness: 350,
                damping: 26,
                staggerChildren: 0.06,
              },
            },
          }}
          className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-xl"
        >
          {SUGGESTION_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <motion.button
                key={chip.label}
                variants={{
                  hidden: { y: 10, opacity: 0, scale: 0.94 },
                  visible: {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 420, damping: 25 },
                  },
                }}
                whileHover={{ scale: 1.035, y: -1.5 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleChipClick(chip.prompt)}
                className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-raised/90 dark:bg-surface-elevated/90 hover:bg-surface-hover dark:hover:bg-surface-hover border border-edge-raised hover:border-primary/40 text-caption font-semibold text-text-secondary hover:text-text-bright shadow-button transition-colors duration-150 cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                <span>{chip.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Composer Slot */}
        {chatInputNode && (
          <motion.div
            variants={{
              hidden: { y: 20, opacity: 0, scale: 0.98 },
              visible: {
                y: 0,
                opacity: 1,
                scale: 1,
                transition: { type: 'spring', stiffness: 320, damping: 26, delay: 0.08 },
              },
            }}
            className="w-full text-left pt-2"
          >
            {chatInputNode}
          </motion.div>
        )}

        {/* Official Engines Strip */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.35, delay: 0.16 },
            },
          }}
          className="pt-2 flex flex-col items-center gap-2 text-micro text-text-muted font-medium"
        >
          <span className="uppercase tracking-widest text-micro text-text-muted">Supported Engines</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">Google Gemini 3.5</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">DeepSeek V4 Flash</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">Tavily Realtime Web</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      {/* Fallback empty state if isNewChat flag is not explicitly passed */}
      {messages.length === 0 && !isLoading && !quotaError && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <StrataIcon className="w-12 h-12" />
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
          <div className="hidden sm:flex shrink-0 mt-0.5">
            <StrataIcon className="w-7 h-7" />
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
