'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Conversation,
  getWorkspaceFiles,
  saveWorkspaceFile,
  deleteWorkspaceFile,
} from '@/lib/db/db';
import { WorkspaceFile } from '@/lib/schemas';
import { generateId } from '@/lib/id';
import { MAX_FILE_CHARS, MAX_FILES_PER_WORKSPACE } from '@/lib/limits';
import { detectLanguage } from '@/lib/languages';

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
  const handleSelectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setIsWorkspaceDrawerOpen(true);
  }, []);

  /**
   * Creates a new workspace file with multi-language extension support and persists it.
   * @param name - The file name; appends .md if no extension is provided.
   * @param content - Optional initial content.
   */
  const handleCreateFile = useCallback(async (name: string, content = '') => {
    if (files.length >= MAX_FILES_PER_WORKSPACE) return;
    const safeContent = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) : content;
    const now = new Date().toISOString();
    const hasExtension = name.includes('.') || name.toLowerCase() === 'dockerfile';
    const finalName = hasExtension ? name : `${name}.md`;
    const detectedLang = detectLanguage(finalName);

    const newFile: WorkspaceFile = {
      id: generateId(),
      name: finalName,
      content: safeContent,
      language: detectedLang,
      createdAt: now,
      updatedAt: now,
    };
    await saveWorkspaceFile(chatId, newFile);
    setActiveFileId(newFile.id);
    setIsWorkspaceDrawerOpen(true);
  }, [chatId, files.length]);

  const pendingUpdatesRef = useRef<Map<string, WorkspaceFile>>(new Map());
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Persists edits to an existing file, truncating content to the size limit.
   * Coalesces rapid sequential updates within a 150ms window to reduce DB rewrites.
   * @param updatedFile - The file with applied edits.
   */
  const handleUpdateFile = useCallback((updatedFile: WorkspaceFile) => {
    const safeFile = updatedFile.content.length > MAX_FILE_CHARS
      ? { ...updatedFile, content: updatedFile.content.slice(0, MAX_FILE_CHARS) }
      : updatedFile;

    pendingUpdatesRef.current.set(safeFile.id, safeFile);

    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(async () => {
      const updates = Array.from(pendingUpdatesRef.current.values());
      pendingUpdatesRef.current.clear();
      for (const file of updates) {
        await saveWorkspaceFile(chatId, file);
      }
    }, 150);
  }, [chatId]);

  /**
   * Deletes a file and falls back to the next remaining file as active.
   * @param fileId - The id of the file to delete.
   */
  const handleDeleteFile = useCallback(async (fileId: string) => {
    await deleteWorkspaceFile(chatId, fileId);
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [chatId, activeFileId, files]);

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
