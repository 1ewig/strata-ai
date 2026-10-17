import { WorkspaceFile } from '@/lib/db/schemas';
import {
  isSameFilename,
  removeFileFromWorkspace,
  upsertFileIntoWorkspace,
} from '@/agent/workspace';
import { db, type Conversation } from '@/lib/db/database';
import { updateConversationFiles } from '@/lib/db/conversations';

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
 * Upserts a workspace file into the conversation: replaces it in place when
 * an entry matches by id or case-insensitive name, otherwise appends it.
 *
 * @param chatId - The conversation owning the file.
 * @param file - The file to save.
 */
export async function saveWorkspaceFile(chatId: string, file: WorkspaceFile): Promise<void> {
  const conv = await db.conversations.get(chatId);
  const currentFiles = getWorkspaceFiles(conv);
  const existing = currentFiles.find(
    (f) => f.id === file.id || isSameFilename(f.name, file.name),
  );
  if (
    existing &&
    existing.content === file.content &&
    existing.name === file.name &&
    existing.language === file.language &&
    conv?.activeFileId === file.id
  ) {
    return;
  }
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
