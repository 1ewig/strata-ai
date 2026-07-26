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

export function useWorkspaceFiles(chatId: string, currentConv?: Conversation) {
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const files = useMemo(() => getWorkspaceFiles(currentConv), [currentConv]);

  // Set default active file if not set
  useEffect(() => {
    if (currentConv?.activeFileId) {
      setActiveFileId(currentConv.activeFileId);
    } else if (files.length > 0 && !activeFileId) {
      setActiveFileId(files[0].id);
    }
  }, [currentConv?.activeFileId, files, activeFileId]);

  const handleSelectFile = (fileId: string) => {
    setActiveFileId(fileId);
    setIsWorkspaceDrawerOpen(true);
  };

  const handleCreateFile = async (name: string, content = '') => {
    const now = new Date().toISOString();
    const newFile: WorkspaceFile = {
      id: generateId(),
      name: name.endsWith('.md') || name.endsWith('.txt') ? name : `${name}.md`,
      content,
      language: name.endsWith('.txt') ? 'text' : 'markdown',
      createdAt: now,
      updatedAt: now,
    };
    await saveWorkspaceFile(chatId, newFile);
    setActiveFileId(newFile.id);
    setIsWorkspaceDrawerOpen(true);
  };

  const handleUpdateFile = async (updatedFile: WorkspaceFile) => {
    await saveWorkspaceFile(chatId, updatedFile);
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
