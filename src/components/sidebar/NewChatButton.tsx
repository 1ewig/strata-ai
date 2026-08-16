import React from 'react';
import { Plus } from 'lucide-react';
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
      <button
        onClick={onNewChat}
        disabled={isMaxConversationsReached}
        className={`group w-full flex items-center justify-center gap-2 font-semibold px-3 py-2 rounded-xl text-label transition-all duration-150 shadow-button ${isMaxConversationsReached
            ? 'bg-surface-elevated text-text-muted opacity-50 cursor-not-allowed border border-edge-raised'
            : 'bg-primary hover:bg-primary-hover active:scale-[0.98] text-surface cursor-pointer'
          }`}
        title={
          isMaxConversationsReached
            ? `Maximum ${MAX_CONVERSATIONS_PER_USER} conversations reached. Delete a chat to create a new one.`
            : 'Create new conversation'
        }
      >
        <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
        New Conversation
      </button>
    </div>
  );
}

export default React.memo(NewChatButton);
