'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteConversation, updateConversationTitle, toggleConversationPin, type Conversation } from '@/lib/db/db';
import { generateId } from '@/lib/id';
import { MAX_CONVERSATIONS_PER_USER } from '@/lib/limits';

/**
 * Returns the conversations belonging to a user, pinned chats first, then most recently updated first.
 * Legacy chats that predate per-user scoping (no `userId`) are included so
 * existing data is never hidden.
 *
 * @param userId - The signed-in user's id; undefined while the session loads.
 * @returns The user's conversations, or undefined while the query resolves.
 */
function getUserConversations(userId: string | undefined): Promise<Conversation[]> | undefined {
  if (!userId) return undefined;
  return db.conversations
    .toArray()
    .then((list) =>
      list
        .filter((c) => !c.userId || c.userId === userId)
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    );
}

/**
 * Manages the conversation list for the sidebar: live Dexie queries, the
 * per-user conversation cap, pin/rename/delete actions with navigation.
 *
 * @param userId - The signed-in user's id (undefined while the session loads).
 * @param currentConversationId - The conversation currently open, used to
 *   decide where to navigate after a deletion.
 * @returns The conversation list, cap state, and create/delete/rename/pin handlers.
 */
export function useConversations(
  userId: string | undefined,
  currentConversationId: string | undefined,
) {
  const router = useRouter();

  const conversations = useLiveQuery(() => getUserConversations(userId), [userId]);

  const conversationCount = conversations?.length || 0;
  // Enforce the per-user conversation cap on the new chat action.
  const isMaxConversationsReached = conversationCount >= MAX_CONVERSATIONS_PER_USER;

  /**
   * Creates a fresh conversation and navigates to it.
   */
  const handleNewChat = useCallback(() => {
    if (isMaxConversationsReached) return;
    const newId = generateId();
    router.push(`/chat-id/${newId}`);
  }, [isMaxConversationsReached, router]);

  /**
   * Deletes a conversation, then navigates away when the open chat is the one
   * being removed: to the most recently updated remaining chat, or to a fresh
   * chat when nothing is left.
   *
   * @param id - The conversation id to delete.
   */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (currentConversationId !== id) return;
      const remaining = await getUserConversations(userId);
      if (remaining && remaining.length > 0) {
        router.push(`/chat-id/${remaining[0].id}`);
      } else {
        const newId = generateId();
        router.push(`/chat-id/${newId}`);
      }
    },
    [currentConversationId, router, userId],
  );

  /**
   * Renames a conversation by id.
   */
  const handleRenameConversation = useCallback(
    async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      await updateConversationTitle(id, newTitle.trim());
    },
    [],
  );

  /**
   * Toggles the pinned status of a conversation.
   */
  const handleTogglePinConversation = useCallback(
    async (id: string) => {
      await toggleConversationPin(id);
    },
    [],
  );

  return {
    conversations,
    conversationCount,
    isMaxConversationsReached,
    handleNewChat,
    handleDeleteConversation,
    handleRenameConversation,
    handleTogglePinConversation,
  };
}
