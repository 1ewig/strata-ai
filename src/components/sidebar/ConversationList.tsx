import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Conversation } from '@/lib/db/db';
import { MAX_CONVERSATIONS_PER_USER } from '@/lib/limits';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  /** The user's conversations, sorted most recent or pinned first. */
  conversations: Conversation[] | undefined;
  /** Total conversation count for the user. */
  conversationCount: number;
  /** Whether the user has hit the conversation cap. */
  isMaxConversationsReached: boolean;
  /** Currently active conversation id. */
  activeConversationId: string;
  /** Callback to close sidebar on mobile navigation. */
  onCloseSidebar?: () => void;
  /** Renames a conversation. */
  onRename?: (id: string, newTitle: string) => Promise<void>;
  /** Toggles the pinned state of a conversation. */
  onTogglePin?: (id: string) => Promise<void>;
  /** Callback to trigger delete confirmation dialog. */
  onRequestDelete: (e: React.MouseEvent, conv: Conversation) => void;
}

/**
 * Scrollable conversation list container with section header, quota indicator,
 * empty state, and item management.
 */
function ConversationList({
  conversations,
  conversationCount,
  isMaxConversationsReached,
  activeConversationId,
  onCloseSidebar,
  onRename,
  onTogglePin,
  onRequestDelete,
}: ConversationListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Close the 3-dots overflow popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleStartRename = useCallback((conv: Conversation) => {
    setEditingChatId(conv.id);
    setActiveMenuId(null);
  }, []);

  const handleSaveRename = useCallback(async (id: string, newTitle: string) => {
    if (newTitle.trim()) {
      await onRename?.(id, newTitle.trim());
    }
    setEditingChatId(null);
  }, [onRename]);

  const handleCancelRename = useCallback(() => {
    setEditingChatId(null);
  }, []);

  const handleToggleMenu = useCallback((id: string) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setActiveMenuId(null);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1 pb-16">
      {/* Section Header */}
      <div className="px-2 py-1 flex items-center justify-between text-micro font-semibold text-text-muted uppercase tracking-wider">
        <span>Conversations</span>
        <span className={isMaxConversationsReached ? 'text-warning font-bold' : ''}>
          {conversationCount} / {MAX_CONVERSATIONS_PER_USER}
        </span>
      </div>

      {/* Empty State or Items List */}
      {!conversations || conversations.length === 0 ? (
        <div className="px-3 py-4 text-center text-caption text-text-faint">
          No saved chats yet
        </div>
      ) : (
        conversations.map((conv, index) => {
          const isActive = activeConversationId === conv.id;
          const isEditingThis = editingChatId === conv.id;
          const isMenuOpen = activeMenuId === conv.id;
          const isNearBottom = conversations.length > 3 && index >= conversations.length - 2;

          return (
            <ConversationItem
              key={conv.id}
              conv={conv}
              isActive={isActive}
              isNearBottom={isNearBottom}
              isEditing={isEditingThis}
              isMenuOpen={isMenuOpen}
              onCloseSidebar={onCloseSidebar}
              onStartRename={handleStartRename}
              onSaveRename={handleSaveRename}
              onCancelRename={handleCancelRename}
              onToggleMenu={handleToggleMenu}
              onCloseMenu={handleCloseMenu}
              onTogglePin={onTogglePin}
              onRequestDelete={onRequestDelete}
              menuContainerRef={isMenuOpen ? menuContainerRef : undefined}
            />
          );
        })
      )}
    </div>
  );
}

export default React.memo(ConversationList);
