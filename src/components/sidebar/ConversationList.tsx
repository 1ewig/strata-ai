import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Conversation } from '@/lib/db/database';
import ConversationItem from './ConversationItem';
import ConversationSection from './ConversationSection';

interface ConversationListProps {
  /** The user's conversations, sorted most recent or pinned first. */
  conversations: Conversation[] | undefined;
  /** Total conversation count for the user. */
  conversationCount: number;
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
 * Scrollable conversation list container with grouped sections, quota indicator,
 * empty state, and item management. Pinned chats render in their own top section,
 * separated from the remaining conversation list.
 */
function ConversationList({
  conversations,
  conversationCount,
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

  const pinnedConversations = useMemo(
    () => (conversations ?? []).filter((conv) => conv.pinned),
    [conversations],
  );

  const otherConversations = useMemo(
    () => (conversations ?? []).filter((conv) => !conv.pinned),
    [conversations],
  );

  const totalCount = conversations?.length ?? 0;
  // Only the last two rows of the whole list flip their overflow menu upward.
  const nearBottomStartIndex = totalCount > 3 ? totalCount - 2 : totalCount;

  const renderConversation = useCallback(
    (conv: Conversation, globalIndex: number) => (
      <ConversationItem
        key={conv.id}
        conv={conv}
        isActive={activeConversationId === conv.id}
        isNearBottom={globalIndex >= nearBottomStartIndex}
        isEditing={editingChatId === conv.id}
        isMenuOpen={activeMenuId === conv.id}
        onCloseSidebar={onCloseSidebar}
        onStartRename={handleStartRename}
        onSaveRename={handleSaveRename}
        onCancelRename={handleCancelRename}
        onToggleMenu={handleToggleMenu}
        onCloseMenu={handleCloseMenu}
        onTogglePin={onTogglePin}
        onRequestDelete={onRequestDelete}
        menuContainerRef={activeMenuId === conv.id ? menuContainerRef : undefined}
      />
    ),
    [
      activeConversationId,
      nearBottomStartIndex,
      editingChatId,
      activeMenuId,
      onCloseSidebar,
      handleStartRename,
      handleSaveRename,
      handleCancelRename,
      handleToggleMenu,
      handleCloseMenu,
      onTogglePin,
      onRequestDelete,
    ],
  );

  const countBadge = (
    <span className="tabular-nums">
      {conversationCount}
    </span>
  );

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-16">
      {!conversations || conversations.length === 0 ? (
        <ConversationSection label="Conversations" trailing={countBadge}>
          <div className="px-3 py-4 text-center text-caption text-text-faint">
            No saved chats yet
          </div>
        </ConversationSection>
      ) : (
        <>
          {pinnedConversations.length > 0 && (
            <ConversationSection label="Pinned">
              {pinnedConversations.map((conv, index) => renderConversation(conv, index))}
            </ConversationSection>
          )}

          {otherConversations.length > 0 && (
            <ConversationSection label="Conversations" trailing={countBadge}>
              {otherConversations.map((conv, index) =>
                renderConversation(conv, pinnedConversations.length + index),
              )}
            </ConversationSection>
          )}
        </>
      )}
    </div>
  );
}

export default React.memo(ConversationList);
