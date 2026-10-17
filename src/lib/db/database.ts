import Dexie, { Table } from 'dexie';
import { UIMessage } from 'ai';
import { WorkspaceFile } from '@/lib/db/schemas';

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
