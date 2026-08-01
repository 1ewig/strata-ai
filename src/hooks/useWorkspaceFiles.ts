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

export function useWorkspaceFiles(chatId: string, currentConv?: Conversation) {
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const files = useMemo(() => getWorkspaceFiles(currentConv), [currentConv]);

  // Reset active file on chat switch
  const [prevChatId, setPrevChatId] = useState(currentConv?.id);
  const [prevActiveFileId, setPrevActiveFileId] = useState(currentConv?.activeFileId);

  if (currentConv?.id !== prevChatId || currentConv?.activeFileId !== prevActiveFileId) {
    setPrevChatId(currentConv?.id);
    setPrevActiveFileId(currentConv?.activeFileId);
    setActiveFileId(currentConv?.activeFileId || (files.length > 0 ? files[0].id : null));
  }


  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    setIsWorkspaceDrawerOpen(true);
  };

  const handleCreateFile = async (name: string, content = '') => {
    if (files.length >= MAX_FILES_PER_WORKSPACE) return;
    const safeContent = content.length > MAX_FILE_CHARS ? content.slice(0, MAX_FILE_CHARS) : content;
    const now = new Date().toISOString();
    const newFile: WorkspaceFile = {
      id: generateId(),
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

  const handleUpdateFile = async (updatedFile: WorkspaceFile) => {
    const safeFile = updatedFile.content.length > MAX_FILE_CHARS
      ? { ...updatedFile, content: updatedFile.content.slice(0, MAX_FILE_CHARS) }
      : updatedFile;
    await saveWorkspaceFile(chatId, safeFile);
  };

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
