'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

/** Props for the NewChatButton component. */
export interface NewChatButtonProps {
  onNewChat: () => void;
  /** Whether the active conversation is already an unstarted/new chat. */
  isNewChat: boolean;
}

/**
 * Mobile-only new chat button. Disabled while already viewing an unstarted chat.
 */
export default function NewChatButton({ onNewChat, isNewChat }: NewChatButtonProps) {
  return (
    <motion.button
      type="button"
      disabled={isNewChat}
      whileHover={isNewChat ? undefined : { scale: 1.05 }}
      whileTap={isNewChat ? undefined : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={onNewChat}
      className={`group md:hidden flex items-center justify-center p-2 rounded-xl border transition-all duration-150 shrink-0 select-none ${
        isNewChat
          ? 'border-edge-raised bg-surface-raised/40 text-text-muted opacity-50 cursor-default shadow-none'
          : 'border-edge-raised hover:border-edge-hover bg-surface-raised/80 hover:bg-surface-hover text-text-primary shadow-button cursor-pointer'
      }`}
      title={isNewChat ? 'Already in a new chat' : 'New chat'}
      aria-label={isNewChat ? 'Already in a new chat' : 'New chat'}
    >
      <Plus
        className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
          !isNewChat ? 'group-hover:text-text-primary group-hover:rotate-90' : ''
        }`}
      />
    </motion.button>
  );
}
