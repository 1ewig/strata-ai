import Dexie, { Table } from 'dexie';
import { ChatMessage, Resume } from '@/lib/schemas';

export interface Conversation {
  id: string;
  title: string;
  model: string;
  thinkingLevel?: string;
  resume?: Resume;
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage extends ChatMessage {
  chatId: string;
}

export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<DBMessage, string>;

  constructor() {
    super('ResumeFlowChatDB');
    this.version(3).stores({
      conversations: 'id, updatedAt, createdAt',
      messages: 'id, chatId, timestamp',
    });
  }
}

export const db = new ChatDatabase();

export async function createConversation(
  id: string,
  initialTitle = 'New Chat',
  model = 'gemini-2.5-flash',
  thinkingLevel?: string
): Promise<Conversation> {
  const now = new Date().toISOString();
  const initialResume: Resume = {
    id: `resume-${id}`,
    title: 'Chat Resume',
    markdownContent: '',
    createdAt: now,
    updatedAt: now,
  };

  const conv: Conversation = {
    id,
    title: initialTitle,
    model,
    thinkingLevel,
    resume: initialResume,
    createdAt: now,
    updatedAt: now,
  };
  await db.conversations.put(conv);
  return conv;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return await db.conversations.get(id);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: new Date().toISOString() });
}

export async function updateConversationModel(id: string, model: string, thinkingLevel?: string): Promise<void> {
  await db.conversations.update(id, { model, thinkingLevel, updatedAt: new Date().toISOString() });
}

export async function updateConversationResume(id: string, resume: Resume): Promise<void> {
  await db.conversations.update(id, { resume, updatedAt: new Date().toISOString() });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.conversations.delete(id);
    await db.messages.where('chatId').equals(id).delete();
  });
}

export async function saveMessage(chatId: string, message: ChatMessage): Promise<void> {
  const dbMsg: DBMessage = { ...message, chatId };
  await db.messages.put(dbMsg);
  await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const dbMsgs = await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
  return dbMsgs.map(({ chatId: _, ...msg }) => msg);
}

export async function clearChatMessages(chatId: string): Promise<void> {
  await db.messages.where('chatId').equals(chatId).delete();
}
