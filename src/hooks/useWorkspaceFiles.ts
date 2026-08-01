'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Conversation,
  getWorkspaceFiles,
  saveWorkspaceFile,
  deleteWorkspaceFile,
} from '@/lib/db/db';
import { WorkspaceFile } from '@/lib/schemas';
import { generateId } from '@/lib/id';
import { MAX_FILE_CHARS, MAX_FILES_PER_WORKSPACE } from '@/lib/limits';

/**
 * Owns the workspace files (markdown/text scratch files) for a chat session.
 * Tracks drawer visibility and the active file, and exposes CRUD handlers that
 * persist to the conversation row via Dexie.
 */
export function useWorkspaceFiles(chatId: string, currentConv?: Conversation) {
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const files = useMemo(() => getWorkspaceFiles(currentConv), [currentConv]);

  // Reset active file on chat switch
  // Re-sync active file from the conversation row whenever the chat or its stored selection changes, during render
  const [prevChatId, setPrevChatId] = useState(currentConv?.id);
  const [prevActiveFileId, setPrevActiveFileId] = useState(currentConv?.activeFileId);

  if (currentConv?.id !== prevChatId || currentConv?.activeFileId !== prevActiveFileId) {
    setPrevChatId(currentConv?.id);
    setPrevActiveFileId(currentConv?.activeFileId);
    setActiveFileId(currentConv?.activeFileId || (files.length > 0 ? files[0].id : null));
  }


  /**
   * Marks a file as active and opens the drawer.
   * @param fileId - The id of the file to select.
   */
  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    setIsWorkspaceDrawerOpen(true);
  };

  /**
   * Creates a new workspace file with default markdown/text naming and persists it.
   * @param name - The file name; an extension is appended if missing.
   * @param content - Optional initial content.
   */
  const handleCreateFile = async (name: string, content = '') => {
    if (files.length >= MAX_FILES_PER_WORKSPACE) return;
    const safeContent = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) : content;
    const now = new Date().toISOString();
    const newFile: WorkspaceFile = {
      id: generateId(),
      // Default to markdown unless the user already specified a supported extension
      name: name.endsWith('.md') || name.endsWith('.txt') ? name : `${name}.md`,
      content: safeContent,
      language: name.endsWith('.txt') ? 'text' : 'markdown',
      createdAt: now,
      updatedAt: now,
    };
    await saveWorkspaceFile(chatId, newFile);
    setActiveFileId(newFile.id);
    setIsWorkspaceDrawerOpen(true);
  };

  /**
   * Persists edits to an existing file, truncating content to the size limit.
   * @param updatedFile - The file with applied edits.
   */
  const handleUpdateFile = async (updatedFile: WorkspaceFile) => {
    const safeFile = updatedFile.content.length > MAX_FILE_CHARS
      ? { ...updatedFile, content: updatedFile.content.slice(0, MAX_FILE_CHARS) }
      : updatedFile;
    await saveWorkspaceFile(chatId, safeFile);
  };

  /**
   * Deletes a file and falls back to the next remaining file as active.
   * @param fileId - The id of the file to delete.
   */
  const handleDeleteFile = async (fileId: string) => {
    await deleteWorkspaceFile(chatId, fileId);
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return {
    files,
    activeFileId,
    isWorkspaceDrawerOpen,
    setIsWorkspaceDrawerOpen,
    setActiveFileId,
    handleSelectFile,
    handleCreateFile,
    handleUpdateFile,
    handleDeleteFile,
  };
}
