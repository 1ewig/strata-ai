import Dexie, { Table } from 'dexie';
import { UIMessage } from 'ai';
import { Resume, WorkspaceFile } from '@/lib/schemas';

export interface Conversation {
  id: string;
  title: string;
  model: string;
  thinkingLevel?: string;
  resume?: Resume;
  files?: WorkspaceFile[];
  activeFileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage extends UIMessage {
  chatId: string;
  timestamp: string;
}

export class ChatDatabase extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<DBMessage, string>;

  constructor() {
    super('ResumeFlowChatDB');
    this.version(4).stores({
      conversations: 'id, updatedAt, createdAt',
      messages: 'id, chatId, timestamp',
    });
  }
}

export const db = new ChatDatabase();

export function getWorkspaceFiles(conv?: Conversation): WorkspaceFile[] {
  if (!conv) return [];
  if (conv.files && conv.files.length > 0) {
    return conv.files;
  }
  // Migration fallback from legacy resume
  if (conv.resume?.markdownContent) {
    return [
      {
        id: conv.resume.id || `file-${conv.id}`,
        name: `${conv.resume.title || 'resume'}.md`,
        content: conv.resume.markdownContent,
        language: 'markdown',
        createdAt: conv.resume.createdAt || conv.createdAt,
        updatedAt: conv.resume.updatedAt || conv.updatedAt,
      },
    ];
  }
  return [];
}

export async function createConversation(
  id: string,
  initialTitle = 'New Chat',
  model = 'gemini-3.5-flash-lite',
  thinkingLevel?: string
): Promise<Conversation> {
  const now = new Date().toISOString();

  const conv: Conversation = {
    id,
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

export async function getConversation(id: string): Promise<Conversation | undefined> {
  return await db.conversations.get(id);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await db.conversations.update(id, { title, updatedAt: new Date().toISOString() });
}

export async function updateConversationModel(id: string, model: string, thinkingLevel?: string): Promise<void> {
  await db.conversations.update(id, { model, thinkingLevel, updatedAt: new Date().toISOString() });
}

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

export async function updateConversationResume(id: string, resume: Resume): Promise<void> {
  const files: WorkspaceFile[] = [
    {
      id: resume.id,
      name: `${resume.title || 'resume'}.md`,
      content: resume.markdownContent,
      language: 'markdown',
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    },
  ];
  await db.conversations.update(id, { resume, files, activeFileId: resume.id, updatedAt: new Date().toISOString() });
}

export async function saveWorkspaceFile(chatId: string, file: WorkspaceFile): Promise<void> {
  const conv = await db.conversations.get(chatId);
  const currentFiles = getWorkspaceFiles(conv);
  const idx = currentFiles.findIndex(f => f.id === file.id);
  let nextFiles: WorkspaceFile[];
  if (idx >= 0) {
    nextFiles = [...currentFiles];
    nextFiles[idx] = file;
  } else {
    nextFiles = [...currentFiles, file];
  }
  await updateConversationFiles(chatId, nextFiles, file.id);
}

export async function deleteWorkspaceFile(chatId: string, fileId: string): Promise<void> {
  const conv = await db.conversations.get(chatId);
  const currentFiles = getWorkspaceFiles(conv);
  const nextFiles = currentFiles.filter(f => f.id !== fileId);
  const nextActiveId = nextFiles.length > 0 ? nextFiles[0].id : undefined;
  await updateConversationFiles(chatId, nextFiles, nextActiveId);
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction('rw', db.conversations, db.messages, async () => {
    await db.conversations.delete(id);
    await db.messages.where('chatId').equals(id).delete();
  });
}

export async function saveMessage(chatId: string, message: UIMessage): Promise<void> {
  const dbMsg: DBMessage = {
    ...message,
    chatId,
    timestamp: new Date().toISOString(),
  };
  await db.messages.put(dbMsg);
  await db.conversations.update(chatId, { updatedAt: new Date().toISOString() });
}

export async function getChatMessages(chatId: string): Promise<UIMessage[]> {
  const dbMsgs = await db.messages.where('chatId').equals(chatId).sortBy('timestamp');
  return dbMsgs.map(({ chatId: _, timestamp: __, ...msg }) => msg as UIMessage);
}

export async function clearChatMessages(chatId: string): Promise<void> {
  await db.messages.where('chatId').equals(chatId).delete();
}

