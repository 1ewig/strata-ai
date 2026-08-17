'use client';

import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Trash2, Eye, Code } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MAX_FILE_CHARS } from '@/lib/limits';
import { detectLanguage, isMarkdownFile } from '@/lib/languages';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { useCopyClipboard } from '@/hooks/useCopyClipboard';
import CodeViewer from './CodeViewer';
import WorkspaceFileSelector from './WorkspaceFileSelector';
import WorkspaceEditor from './WorkspaceEditor';
import WorkspaceEmptyState from './WorkspaceEmptyState';
import WorkspaceDrawerFooter from './WorkspaceDrawerFooter';

/** Props for the WorkspaceDrawer component. */
interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: WorkspaceFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onUpdateFile: (file: WorkspaceFile) => void;
  onCreateFile: (name: string, content?: string) => void;
  onDeleteFile: (fileId: string) => void;
  isLoading?: boolean;
}

/**
 * Slide-in drawer panel for viewing and editing workspace files.
 * Orchestrates file switching, markdown preview vs syntax-highlighted code viewing,
 * and inline file creation/editing.
 */
export default React.memo(function WorkspaceDrawer({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onUpdateFile,
  onCreateFile,
  onDeleteFile,
}: WorkspaceDrawerProps) {
  const activeFile = files.find((f) => f.id === activeFileId) || files[0] || null;

  const [isEditing, setIsEditing] = useState(false);
  const [fileName, setFileName] = useState(activeFile?.name || '');
  const [contentValue, setContentValue] = useState(activeFile?.content || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);
  const [markdownViewMode, setMarkdownViewMode] = useState<'preview' | 'source'>('preview');

  const { copied, copiedId, copy } = useCopyClipboard();

  const handleStartEditing = () => {
    setFileName(activeFile?.name || '');
    setContentValue(activeFile?.content || '');
    setIsEditing(true);
  };

  const isFileOverLimit = isEditing && contentValue.length > MAX_FILE_CHARS;
  const isFileWarning = isEditing && contentValue.length > MAX_FILE_CHARS * 0.9 && !isFileOverLimit;

  const handleSaveEdit = () => {
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
  };

  const handleCreateNewFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (!trimmed) return;
    onCreateFile(trimmed, '');
    setNewFileName('');
    setIsCreatingNew(false);
  };

  const handleSelectFile = (fileId: string) => {
    setIsEditing(false);
    onSelectFile(fileId);
  };

  const handleOpenCreateNew = () => {
    setIsEditing(false);
    setIsCreatingNew(true);
  };

  const isMarkdown = isMarkdownFile(activeFile?.name, activeFile?.language);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div key="workspace-drawer-container" className="fixed inset-0 h-dvh z-50 overflow-hidden flex justify-end">
            <motion.div
              key="workspace-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-scrim backdrop-blur-sm"
            />

            <motion.div
              key="workspace-drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-3xl bg-surface-raised border-l border-edge-raised shadow-card-lg h-full flex flex-col z-10"
            >
              {/* Top Navigation Bar */}
              <div className="h-14 px-3 sm:px-6 border-b border-edge-raised flex items-center justify-between bg-surface-base/40 shrink-0 gap-4">
                <WorkspaceFileSelector
                  files={files}
                  activeFile={activeFile}
                  onSelectFile={handleSelectFile}
                  onCreateNewClick={handleOpenCreateNew}
                />

                <div className="flex items-center gap-2 shrink-0">
                  {activeFile && isMarkdown && !isEditing && activeFile.content && (
                    <div className="flex items-center bg-surface-base border border-edge-raised rounded-lg p-0.5 text-caption">
                      <button
                        type="button"
                        onClick={() => setMarkdownViewMode('preview')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
                          markdownViewMode === 'preview'
                            ? 'bg-surface-raised text-primary shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Rendered Markdown Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarkdownViewMode('source')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
                          markdownViewMode === 'source'
                            ? 'bg-surface-raised text-primary shadow-sm font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                        title="Raw Markdown Source Code"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Source</span>
                      </button>
                    </div>
                  )}

                  {activeFile && (
                    <button
                      onClick={() => setFileToDelete(activeFile)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-soft/30 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="w-px h-4 bg-edge-raised" />

                  <button
                    onClick={onClose}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated active:scale-90 rounded-lg transition-all duration-150 cursor-pointer"
                    title="Close drawer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Inline Create Form */}
              {isCreatingNew && (
                <form onSubmit={handleCreateNewFileSubmit} className="p-3 bg-surface-elevated border-b border-edge-raised flex items-center gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. index.html, app.ts, styles.css, document.md"
                    className="flex-1 bg-surface-base border border-edge-raised rounded-lg px-3 py-1.5 text-label text-text-primary focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  <button type="submit" className="text-label font-semibold bg-primary hover:bg-primary-hover active:scale-95 text-surface px-3.5 py-1.5 rounded-lg transition-all duration-150 shadow-button cursor-pointer">
                    Create
                  </button>
                  <button type="button" onClick={() => setIsCreatingNew(false)} className="text-label text-text-muted hover:text-text-primary active:scale-95 px-2.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer">
                    Cancel
                  </button>
                </form>
              )}

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {!activeFile ? (
                  <WorkspaceEmptyState type="no-files" onCreateFileClick={handleOpenCreateNew} />
                ) : isEditing ? (
                  <WorkspaceEditor
                    key={activeFile.id}
                    fileName={fileName}
                    contentValue={contentValue}
                    onFileNameChange={setFileName}
                    onContentChange={setContentValue}
                  />
                ) : !activeFile.content ? (
                  <WorkspaceEmptyState type="empty-file" fileName={activeFile.name} onEditFileClick={handleStartEditing} />
                ) : isMarkdown && markdownViewMode === 'preview' ? (
                  <article className="text-body text-text-primary leading-relaxed selection:bg-secondary/50">
                    <MarkdownRenderer
                      content={activeFile.content}
                      variant="canvas"
                      enableSnippetCopy
                      className="text-body text-text-primary leading-relaxed"
                    />
                  </article>
                ) : (
                  <CodeViewer
                    key={activeFile.id}
                    code={activeFile.content}
                    filenameOrLanguage={activeFile.name || activeFile.language}
                  />
                )}
              </div>

              {/* Drawer Footer */}
              {activeFile && (
                <WorkspaceDrawerFooter
                  activeFile={activeFile}
                  isEditing={isEditing}
                  contentValue={contentValue}
                  isFileOverLimit={isFileOverLimit}
                  isFileWarning={isFileWarning}
                  copied={copied}
                  onCopy={() => copy(activeFile.content)}
                  onStartEditing={handleStartEditing}
                  onCancelEditing={() => setIsEditing(false)}
                  onSaveEdit={handleSaveEdit}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={Boolean(fileToDelete)}
        title="Delete File"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-text-bright font-semibold">{fileToDelete?.name}</strong>?
            This will permanently remove the file from your workspace.
          </>
        }
        confirmLabel="Delete File"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (fileToDelete) {
            onDeleteFile(fileToDelete.id);
            setFileToDelete(null);
          }
        }}
        onCancel={() => setFileToDelete(null)}
      />
    </>
  );
});
