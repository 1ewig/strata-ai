'use client';

import React from 'react';
import { Globe, FileText, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import ChatBubble from '@/components/chat/message/ChatBubble';
import CompactionDivider from '@/components/chat/message/CompactionDivider';
import { StrataIcon } from '@/components/ui/strata-icon';
import {
  heroStaggerVariants,
  heroItemVariants,
  emblemPopVariants,
  chipHoverProps,
} from '@/components/chat/animations';

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
  chatId?: string;
  isNewChat?: boolean;
  chatInputNode?: React.ReactNode;
}

/**
 * Orchestrates the chat message area: an empty-state hero, the message
 * bubbles, a typing indicator, and the scroll anchor.
 *
 * @param messages - Conversation messages rendered as ChatBubble rows.
 * @param isLoading - Shows the typing indicator while the assistant responds.
 * @param messagesEndRef - Scroll anchor appended after the last message.
 * @param onOpenDrawer - Passed through to bubbles for tool card drawer actions.
 * @param chatId - Active conversation ID used to pick a stable welcome greeting.
 * @param isNewChat - True when no messages exist, centering the composer in the hero.
 * @param chatInputNode - The ChatInput node rendered in the centered hero.
 */
export default React.memo(function ChatPanel({
  messages,
  isLoading,
  messagesEndRef,
  onOpenDrawer,
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
        variants={heroStaggerVariants}
        className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto w-full px-2 py-4"
      >
        {/* Brand Icon matching Sidebar with spring pop and ambient glow */}
        <motion.div
          variants={emblemPopVariants}
          className="relative group"
        >
          <StrataIcon className="w-14 h-14 transition-transform duration-300 group-hover:scale-105" />
          {/* Subtle ambient decorative glow */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-primary/25 to-secondary/25 blur-md -z-10 animate-pulse" />
        </motion.div>

        {/* Hero Greeting */}
        <motion.h2
          variants={heroItemVariants}
          className="text-title sm:text-display font-bold text-text-bright font-display tracking-tight"
        >
          {welcomeMessage}
        </motion.h2>

        {/* Quick Action Suggestion Chips */}
        <motion.div
          variants={heroItemVariants}
          className="flex flex-wrap items-center justify-center gap-2 pt-1 max-w-xl"
        >
          {SUGGESTION_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <motion.button
                key={chip.label}
                variants={heroItemVariants}
                {...chipHoverProps}
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
            variants={heroItemVariants}
            className="w-full text-left pt-2"
          >
            {chatInputNode}
          </motion.div>
        )}

        {/* Official Engines Strip */}
        <motion.div
          variants={heroItemVariants}
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
      {messages.length === 0 && !isLoading && (
        <motion.div
          variants={heroItemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-20 text-center space-y-3"
        >
          <StrataIcon className="w-12 h-12" />
          <h3 className="text-heading font-semibold text-text-primary font-display">Ready to help with your workspace</h3>
        </motion.div>
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

      {/* Standalone typing bubble before the first assistant tokens arrive. */}
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
});
