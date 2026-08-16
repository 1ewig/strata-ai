import React, { useState, useCallback } from 'react';
import type { Conversation } from '@/lib/db/db';
import type { authClient } from '@/lib/auth-client';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SidebarHeader from './SidebarHeader';
import NewChatButton from './NewChatButton';
import ConversationList from './ConversationList';
import SidebarFooter from './SidebarFooter';

/** The resolved session shape produced by the auth client. */
export type Session = typeof authClient.$Infer.Session;

/** Props for the Sidebar component. */
export interface SidebarProps {
  /** The user's conversations, most recently updated first. */
  conversations: Conversation[] | undefined;
  /** Number of conversations the user has. */
  conversationCount: number;
  /** Whether the per-user conversation cap has been reached. */
  isMaxConversationsReached: boolean;
  /** The id of the conversation currently open, used to highlight it. */
  activeConversationId: string;
  /** Whether the mobile drawer is expanded. */
  isOpen?: boolean;
  /** Callback invoked when the drawer should close. */
  onClose?: () => void;
  /** Creates a new conversation and navigates to it. */
  onNewChat: () => void;
  /** Deletes a conversation, navigating away if it was the open one. */
  onDelete: (id: string) => Promise<void>;
  /** Renames a conversation. */
  onRename?: (id: string, newTitle: string) => Promise<void>;
  /** Toggles the pinned state of a conversation. */
  onTogglePin?: (id: string) => Promise<void>;
  /** The signed-in user's session, forwarded to the user button. */
  session: Session;
  /** Whether a sign-out request is in flight, forwarded to the user button. */
  isSigningOut: boolean;
  /** Clears the session, forwarded to the user button. */
  onSignOut: () => Promise<void>;
  /** Whether dark mode is active, forwarded to the theme toggle. */
  isDark: boolean;
  /** Toggles the theme, forwarded to the theme toggle. */
  onToggleTheme: () => void;
  /** Remaining 5-hour/weekly message quota, forwarded to the quota ring. */
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
}

/**
 * Application sidebar showing the brand header, new chat creation, and the
 * current user's conversation list. Renders as a fixed rail on desktop and
 * an off-canvas drawer with a scrim backdrop on mobile.
 */
function Sidebar({
  conversations,
  conversationCount,
  isMaxConversationsReached,
  activeConversationId,
  isOpen = false,
  onClose,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
  session,
  isSigningOut,
  onSignOut,
  isDark,
  onToggleTheme,
  rateLimitData: rateLimitDataProp,
}: SidebarProps) {
  const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);

  const rateLimitData = rateLimitDataProp ?? null;
  const isQuotaExhausted =
    rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);

  const handleNewChat = useCallback(() => {
    onNewChat();
    onClose?.();
  }, [onNewChat, onClose]);

  const handleRequestDelete = useCallback((e: React.MouseEvent, conv: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(conv);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!chatToDelete) return;
    await onDelete(chatToDelete.id);
    setChatToDelete(null);
  }, [chatToDelete, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setChatToDelete(null);
  }, []);

  return (
    <>
      {/* Mobile scrim backdrop that closes the drawer on tap */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-raised border-r border-edge-raised flex flex-col h-dvh shrink-0 select-none shadow-card-lg transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarHeader onClose={onClose} />

        <NewChatButton
          onNewChat={handleNewChat}
          isMaxConversationsReached={isMaxConversationsReached}
        />

        <ConversationList
          conversations={conversations}
          conversationCount={conversationCount}
          isMaxConversationsReached={isMaxConversationsReached}
          activeConversationId={activeConversationId}
          onCloseSidebar={onClose}
          onRename={onRename}
          onTogglePin={onTogglePin}
          onRequestDelete={handleRequestDelete}
        />

        <SidebarFooter
          session={session}
          isSigningOut={isSigningOut}
          onSignOut={onSignOut}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          rateLimitData={rateLimitData}
          isQuotaExhausted={isQuotaExhausted}
        />
      </aside>

      <ConfirmDialog
        isOpen={Boolean(chatToDelete)}
        title="Delete Chat"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-text-bright font-semibold">
              {chatToDelete?.title || 'Untitled Chat'}
            </strong>
            ? This will permanently remove the conversation and its messages.
          </>
        }
        confirmLabel="Delete Chat"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}

export default React.memo(Sidebar);
