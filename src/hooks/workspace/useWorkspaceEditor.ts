'use client';

import { useState, useCallback } from 'react';
import type { WorkspaceFile } from '@/lib/db/schemas';
import { MAX_FILE_CHARS } from '@/lib/limits';
import { detectLanguage, isMarkdownFile } from '@/lib/code/languages';
import { useCopyClipboard } from '@/hooks/common/useCopyClipboard';
import { downloadWorkspaceFile } from '@/lib/workspace/download';

/** Options required by the useWorkspaceEditor hook. */
export interface UseWorkspaceEditorOptions {
  activeFile: WorkspaceFile | null;
  onUpdateFile: (file: WorkspaceFile) => void;
  onCreateFile: (name: string, content?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onSelectFile: (fileId: string) => void;
}

/**
 * Encapsulates all stateful editing, file creation, validation,
 * and view mode mechanics for the WorkspaceDrawer.
 */
export function useWorkspaceEditor({
  activeFile,
  onUpdateFile,
  onCreateFile,
  onDeleteFile,
  onSelectFile,
}: UseWorkspaceEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [fileName, setFileName] = useState(activeFile?.name || '');
  const [contentValue, setContentValue] = useState(activeFile?.content || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);
  const [markdownViewMode, setMarkdownViewMode] = useState<'preview' | 'source'>('preview');

  const { copied, copy } = useCopyClipboard();

  const handleStartEditing = useCallback(() => {
    setFileName(activeFile?.name || '');
    setContentValue(activeFile?.content || '');
    setIsEditing(true);
  }, [activeFile?.name, activeFile?.content]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const isFileOverLimit = isEditing && contentValue.length > MAX_FILE_CHARS;
  const isFileWarning = isEditing && contentValue.length > MAX_FILE_CHARS * 0.9 && !isFileOverLimit;

  const handleSaveEdit = useCallback(() => {
    if (!activeFile || isFileOverLimit) return;
    const finalName = fileName.trim() || activeFile.name;
    onUpdateFile({
      ...activeFile,
      name: finalName,
      language: detectLanguage(finalName),
      content: contentValue,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  }, [activeFile, fileName, contentValue, isFileOverLimit, onUpdateFile]);

  const handleOpenCreateNew = useCallback(() => {
    setIsEditing(false);
    setIsCreatingNew(true);
  }, []);

  const handleCancelCreateNew = useCallback(() => {
    setIsCreatingNew(false);
  }, []);

  const handleCreateNewFileSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newFileName.trim();
      if (!trimmed) return;
      onCreateFile(trimmed, '');
      setNewFileName('');
      setIsCreatingNew(false);
    },
    [newFileName, onCreateFile],
  );

  const handleSelectFile = useCallback(
    (fileId: string) => {
      setIsEditing(false);
      onSelectFile(fileId);
    },
    [onSelectFile],
  );

  const handleRequestDelete = useCallback((file: WorkspaceFile) => {
    setFileToDelete(file);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete.id);
      setFileToDelete(null);
    }
  }, [fileToDelete, onDeleteFile]);

  const handleCancelDelete = useCallback(() => {
    setFileToDelete(null);
  }, []);

  const handleCopyContent = useCallback(() => {
    if (activeFile?.content) {
      copy(activeFile.content);
    }
  }, [activeFile?.content, copy]);

  const handleDownloadFile = useCallback(() => {
    if (activeFile) {
      downloadWorkspaceFile(activeFile);
    }
  }, [activeFile]);

  const isMarkdown = isMarkdownFile(activeFile?.name, activeFile?.language);

  return {
    isEditing,
    fileName,
    setFileName,
    contentValue,
    setContentValue,
    isCreatingNew,
    newFileName,
    setNewFileName,
    fileToDelete,
    markdownViewMode,
    setMarkdownViewMode,
    isFileOverLimit,
    isFileWarning,
    isMarkdown,
    copied,
    handleStartEditing,
    handleCancelEditing,
    handleSaveEdit,
    handleOpenCreateNew,
    handleCancelCreateNew,
    handleCreateNewFileSubmit,
    handleSelectFile,
    handleRequestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handleCopyContent,
    handleDownloadFile,
  };
}
