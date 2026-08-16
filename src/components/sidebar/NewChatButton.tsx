import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { MAX_CONVERSATIONS_PER_USER } from '@/lib/limits';

interface NewChatButtonProps {
  /** Creates a new conversation and triggers navigation. */
  onNewChat: () => void;
  /** Whether the user has reached the maximum allowed conversations cap. */
  isMaxConversationsReached: boolean;
}

/**
 * Call-to-action button that creates a new conversation or shows disabled
 * state when the maximum conversation cap is reached.
 */
function NewChatButton({ onNewChat, isMaxConversationsReached }: NewChatButtonProps) {
  return (
    <div className="p-3 border-b border-edge-hover/50 shrink-0">
      <motion.button
        type="button"
        onClick={onNewChat}
        disabled={isMaxConversationsReached}
        whileHover={isMaxConversationsReached ? undefined : { scale: 1.015 }}
        whileTap={isMaxConversationsReached ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`group relative overflow-hidden w-full flex items-center justify-center gap-2 font-semibold px-3.5 py-2.5 rounded-xl text-label transition-colors duration-150 shadow-button ${
          isMaxConversationsReached
            ? 'bg-surface-elevated text-text-muted opacity-50 cursor-not-allowed border border-edge-raised'
            : 'bg-primary hover:bg-primary-hover text-surface cursor-pointer'
        }`}
        title={
          isMaxConversationsReached
            ? `Maximum ${MAX_CONVERSATIONS_PER_USER} conversations reached. Delete a chat to create a new one.`
            : 'Create new conversation'
        }
      >
        {/* Subtle shine sweep effect on hover */}
        {!isMaxConversationsReached && (
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-700 bg-gradient-to-r from-transparent via-surface/20 to-transparent pointer-events-none transition-transform ease-out" />
        )}
        <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        <span>New Conversation</span>
      </motion.button>
    </div>
  );
}

export default React.memo(NewChatButton);

