import Dexie, { Table } from 'dexie';
import { UIMessage } from 'ai';
import { WorkspaceFile } from '@/lib/schemas';
import {
  removeFileFromWorkspace,
  upsertFileIntoWorkspace,
} from '@/lib/ai/workspace';

/**
 * A persisted chat session row stored in the `conversations` table.
 *
 * Holds the chat metadata (title, model, thinking level) plus the current
 * workspace snapshot: the files the agent can operate on and which file is
 * active.
 */
export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  model: string;
  thinkingLevel?: string;
  pinned?: boolean;
  files?: WorkspaceFile[];
  activeFileId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A chat message row stored in the `messages` table.
 *
 * Extends the AI SDK's `UIMessage` with the owning conversation id, the
 * optional owning user id, and a timestamp used for ordering replies.
 */
export interface DBMessage extends UIMessage {
  chatId: string;
  userId?: string;
  timestamp: string;
}

/**
 * The Dexie-backed client-side chat database.
 *
 * Tables:
 * - `conversations` — chat sessions, keyed by id, indexed on
 *   `updatedAt` / `createdAt` (for ordering) and `userId` (per-user isolation).
 * - `messages` — chat messages, keyed by id, indexed on `chatId` (for
 *   fetch-by-chat) and `userId` (per-user isolation).
 *
 * The schema is versioned so IndexedDB can migrate existing stores in place:
 * v4 establishes the base shape, and v5 re-declares both stores with the
 * added `userId` index.
 */
export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<DBMessage, string>;

  constructor() {
    super('StrataAIChatDB');
    // Schema v4: base chat + messages tables without user scoping.
    this.version(4).stores({
      conversations: 'id, updatedAt, createdAt',
      messages: 'id, chatId, timestamp',
    });
    // Schema v5: adds the `userId` index to both tables so records are
    // scoped per signed-in user, enabling per-user session isolation.
    this.version(5).stores({
      conversations: 'id, userId, updatedAt, createdAt',
      messages: 'id, chatId, userId, timestamp',
    });
  }
}

/**
 * Shared singleton instance of the chat database.
 */
export const db = new ChatDatabase();

/**
 * Resolves the workspace files for a conversation.
 *
 * @param conv - The conversation to read files from, if any.
 * @returns The workspace file list; empty when nothing is stored.
 */
export function getWorkspaceFiles(conv?: Conversation): WorkspaceFile[] {
  if (!conv) return [];
  return conv.files ?? [];
}

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
 * Upserts a workspace file into the conversation: replaces it in place when
 * an entry matches by id or case-insensitive name, otherwise appends it.
 *
 * @param chatId - The conversation owning the file.
 * @param file - The file to save.
 */
export async function saveWorkspaceFile(chatId: string, file: WorkspaceFile): Promise<void> {
  const conv = await db.conversations.get(chatId);
  const currentFiles = getWorkspaceFiles(conv);
  const nextFiles = upsertFileIntoWorkspace(currentFiles, file);
  await updateConversationFiles(chatId, nextFiles, file.id);
}

/**
 * Removes a workspace file and falls the active file back to the first
 * remaining file, if any.
 *
 * @param chatId - The conversation owning the file.
 * @param fileId - The id or case-insensitive name of the file to delete.
 */
export async function deleteWorkspaceFile(chatId: string, fileId: string): Promise<void> {
  const conv = await db.conversations.get(chatId);
  const currentFiles = getWorkspaceFiles(conv);
  const nextFiles = removeFileFromWorkspace(currentFiles, fileId);
  const nextActiveId = nextFiles.length > 0 ? nextFiles[0].id : undefined;
  await updateConversationFiles(chatId, nextFiles, nextActiveId);
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
 * Persists a message under a conversation and bumps the conversation's
 * `updatedAt` so it surfaces at the top of chat lists.
 *
 * @param chatId - The conversation owning the message.
 * @param message - The AI SDK message to store.
 * @param userId - Optional owner id; recorded only when provided.
 */
export async function saveMessage(chatId: string, message: UIMessage, userId?: string): Promise<void> {
  const dbMsg: DBMessage = {
    ...message,
    chatId,
    ...(userId ? { userId } : {}),
    timestamp: new Date().toISOString(),
  };
  await db.messages.put(dbMsg);
  await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });
}

/**
 * Loads a conversation's messages in chronological order.
 *
 * @param chatId - The conversation to read messages from.
 * @returns The messages with Dexie-only storage fields stripped out.
 */
export async function getChatMessages(chatId: string): Promise<UIMessage[]> {
  const dbMsgs = await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
  // Strip the storage-only fields (`chatId`, `timestamp`) from each row.
  return dbMsgs.map(({ chatId: _, timestamp: __, ...msg }) => msg as UIMessage);
}

/**
 * Deletes every message belonging to a conversation.
 *
 * @param chatId - The conversation whose messages should be cleared.
 */
export async function clearChatMessages(chatId: string): Promise<void> {
  await db.messages.where('chatId').equals(chatId).delete();
}
