import { UIMessage } from 'ai';
import { db, type DBMessage } from '@/lib/db/database';

/**
 * Persists an ordered batch of messages for a conversation, stamping each with
 * a strictly increasing position-derived timestamp so sorting by timestamp
 * reproduces true conversation order without UUID tie-breaker collisions.
 * Also bumps the conversation's `updatedAt` timestamp.
 *
 * @param chatId - The conversation owning the messages.
 * @param messages - Array of UI messages to persist.
 * @param userId - Optional owner id; recorded only when provided.
 */
export async function persistMessages(
  chatId: string,
  messages: unknown[],
  userId?: string,
): Promise<void> {
  if (!messages || messages.length === 0) return;
  const base = Date.now();
  const dbMessages: DBMessage[] = (messages as any[]).map((msg, idx) => ({
    ...msg,
    chatId,
    ...(userId ? { userId } : {}),
    timestamp: new Date(base + idx).toISOString(),
  }));

  await db.transaction('rw', [db.messages, db.conversations], async () => {
    await db.messages.bulkPut(dbMessages);
    await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });
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
  return dbMsgs.map(({ chatId: _chatId, timestamp: _timestamp, ...msg }) => msg as UIMessage);
}

/**
 * Deletes every message belonging to a conversation.
 *
 * @param chatId - The conversation whose messages should be cleared.
 */
export async function clearChatMessages(chatId: string): Promise<void> {
  await db.messages.where('chatId').equals(chatId).delete();
}
