'use client';

import React from 'react';
import { motion } from 'motion/react';
import { StrataIcon } from '@/components/ui/strata-icon';
import { useChatInput } from '@/contexts/ChatInputContext';
import {
  heroStaggerVariants,
  heroItemVariants,
  emblemPopVariants,
  chipHoverProps,
} from '@/constants/animations';
import { SUGGESTION_CHIPS, getWelcomeMessage } from '@/constants/prompts';

export interface ChatHeroProps {
  chatId?: string;
  chatInputNode?: React.ReactNode;
}

/**
 * Empty-state hero presentation shown on new/empty conversations:
 * brand icon with ambient glow, greeting, suggestion chips, centered
 * chat input slot, and supported engines strip.
 */
function ChatHero({ chatId, chatInputNode }: ChatHeroProps) {
  const { insertPrompt } = useChatInput();

  const welcomeMessage = React.useMemo(() => {
    return getWelcomeMessage(chatId);
  }, [chatId]);

  const handleChipClick = (promptText: string) => {
    insertPrompt(promptText);
  };

  return (
    <motion.div
      key={chatId || 'new-chat-hero'}
      initial="hidden"
      animate="visible"
      variants={heroStaggerVariants}
      className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto w-full px-2 py-4"
    >
      {/* Brand Icon matching Sidebar with spring pop and ambient glow */}
      <motion.div variants={emblemPopVariants} className="relative group">
        <StrataIcon className="w-14 h-14 transition-transform duration-300 group-hover:scale-105" />
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

      {/* Chat Input Slot */}
      {chatInputNode && (
        <motion.div variants={heroItemVariants} className="w-full text-left pt-2">
          {chatInputNode}
        </motion.div>
      )}

      {/* Supported Engines Strip */}
      <motion.div
        variants={heroItemVariants}
        className="pt-2 flex flex-col items-center gap-2 text-micro text-text-muted font-medium"
      >
        <span className="uppercase tracking-widest text-micro text-text-muted">
          Supported Engines
        </span>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">
            Google Gemini 3.5
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">
            GLM 5.3 Flash
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface-raised/80 dark:bg-surface-elevated/70 border border-edge-raised text-text-secondary font-semibold text-micro hover:border-primary/30 transition-colors">
            Tavily Realtime Web
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default React.memo(ChatHero);
