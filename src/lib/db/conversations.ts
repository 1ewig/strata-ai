import { db, type Conversation } from '@/lib/db/database';
import { WorkspaceFile } from '@/lib/db/schemas';

/**
 * Creates and persists a new conversation.
 *
 * @param id - Unique conversation id (typically a UUID).
 * @param initialTitle - Display title; defaults to 'New Chat'.
 * @param model - Model id; defaults to the lite model.
 * @param thinkingLevel - Optional thinking level for the model.
 * @param userId - Owner id; recorded only when provided.
 * @returns The persisted conversation row.
 */
export async function createConversation(
  id: string,
  initialTitle = 'New Chat',
  model = 'gemini-3.5-flash-lite',
  thinkingLevel?: string,
  userId?: string
): Promise<Conversation> {
  const now = new Date().toISOString();

  const conv: Conversation = {
    id,
    ...(userId ? { userId } : {}),
    title: initialTitle,
    model,
    thinkingLevel,
    files: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.conversations.put(conv);
  return conv;
}

/**
 * Fetches a single conversation by id.
 *
 * @param id - The conversation id to look up.
 * @returns The conversation row, or undefined when it does not exist.
 */
export async function getConversation(id: string): Promise<Conversation | undefined> {
  return await db.conversations.get(id);
}

/**
 * Renames a conversation and bumps its `updatedAt` timestamp.
 *
 * @param id - The conversation id to update.
 * @param title - The new title.
 */
export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: new Date().toISOString() });
}

/**
 * Toggles the pinned status of a conversation.
 *
 * @param id - The conversation id to update.
 */
export async function toggleConversationPin(id: string): Promise<void> {
  const conv = await db.conversations.get(id);
  if (!conv) return;
  await db.conversations.update(id, { pinned: !conv.pinned });
}

/**
 * Swaps the model (and optional thinking level) of a conversation.
 *
 * @param id - The conversation id to update.
 * @param model - The new model id.
 * @param thinkingLevel - Optional thinking level for the new model.
 */
export async function updateConversationModel(id: string, model: string, thinkingLevel?: string): Promise<void> {
  await db.conversations.update(id, { model, thinkingLevel, updatedAt: new Date().toISOString() });
}

/**
 * Replaces the workspace file list of a conversation.
 *
 * @param id - The conversation id to update.
 * @param files - The full workspace file list to persist.
 * @param activeFileId - Optional id of the file to mark as active.
 */
export async function updateConversationFiles(
  id: string,
  files: WorkspaceFile[],
  activeFileId?: string
): Promise<void> {
  await db.conversations.update(id, {
    files,
    ...(activeFileId !== undefined ? { activeFileId } : {}),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes a conversation and all of its messages in one atomic transaction.
 *
 * @param id - The conversation id to delete.
 */
export async function deleteConversation(id: string): Promise<void> {
  // Both tables must be updated together so no orphaned messages survive.
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.conversations.delete(id);
    await db.messages.where('chatId').equals(id).delete();
  });
}

/**
 * Checks whether a conversation has zero messages and zero workspace files.
 *
 * @param chatId - The conversation id to inspect.
 * @returns True if the conversation does not exist or has no messages and no files.
 */
export async function isConversationEmpty(chatId: string): Promise<boolean> {
  const conv = await db.conversations.get(chatId);
  if (!conv) return true;
  if (conv.files && conv.files.length > 0) return false;
  const count = await db.messages.where('chatId').equals(chatId).count();
  return count === 0;
}

/**
 * Finds an existing empty/unstarted conversation belonging to the user.
 *
 * @param userId - The user id to query.
 * @returns An existing empty Conversation row, or undefined if none exists.
 */
export async function findExistingEmptyConversation(userId: string | undefined): Promise<Conversation | undefined> {
  if (!userId) return undefined;
  const list = await db.conversations
    .filter((c) => !c.userId || c.userId === userId)
    .toArray();

  // Sort descending by updatedAt so we favor the most recently visited empty chat
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  for (const conv of list) {
    if (conv.files && conv.files.length > 0) continue;
    const msgCount = await db.messages.where('chatId').equals(conv.id).count();
    if (msgCount === 0) {
      return conv;
    }
  }
  return undefined;
}

/**
 * Enforces the single-empty-conversation invariant for a user: keeps one empty
 * conversation and deletes the rest. The survivor is the currently open chat
 * when it is empty, otherwise the most recently updated empty chat. This keeps
 * a new chat the user just left visible in the sidebar while still preventing a
 * second unstarted chat from accumulating.
 *
 * @param userId - The owner user id.
 * @param keepChatId - The conversation currently open; always preserved and
 *   preferred as the survivor when it has no messages or files.
 */
export async function pruneEmptyConversations(userId: string | undefined, keepChatId?: string): Promise<void> {
  if (!userId) return;
  const list = await db.conversations
    .filter((c) => !c.userId || c.userId === userId)
    .toArray();

  const emptyConvs: Conversation[] = [];
  let keepIsEmpty = false;
  for (const conv of list) {
    if (conv.files && conv.files.length > 0) continue;
    const count = await db.messages.where('chatId').equals(conv.id).count();
    if (count !== 0) continue;
    if (conv.id === keepChatId) {
      keepIsEmpty = true;
      continue;
    }
    emptyConvs.push(conv);
  }

  // Keep the current chat when it is empty, otherwise the most recently updated empty chat.
  emptyConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const emptyIdsToDelete = (keepIsEmpty ? emptyConvs : emptyConvs.slice(1)).map((c) => c.id);

  if (emptyIdsToDelete.length > 0) {
    await db.transaction('rw', [db.conversations, db.messages], async () => {
      for (const id of emptyIdsToDelete) {
        await db.conversations.delete(id);
        await db.messages.where('chatId').equals(id).delete();
      }
    });
  }
}
