'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, FileText, Copy, Edit3, Check, Plus, Trash2, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WorkspaceFile } from '@/lib/schemas';
import { MAX_FILE_CHARS, MAX_FILES_PER_WORKSPACE, formatCharCount } from '@/lib/limits';

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

export default function WorkspaceDrawer({
  isOpen,
  onClose,
  files,
  activeFileId,
  onSelectFile,
  onUpdateFile,
  onCreateFile,
  onDeleteFile,
}: WorkspaceDrawerProps) {
  const activeFile = files.find(f => f.id === activeFileId) || files[0] || null;

  const [isEditing, setIsEditing] = useState(false);
  const [fileName, setFileName] = useState(activeFile?.name || '');
  const [contentValue, setContentValue] = useState(activeFile?.content || '');
  const [copied, setCopied] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleStartEditing = () => {
    setFileName(activeFile?.name || '');
    setContentValue(activeFile?.content || '');
    setIsEditing(true);
  };

  if (!isOpen) return null;

  const isFileOverLimit = isEditing && contentValue.length > MAX_FILE_CHARS;
  const isFileWarning = isEditing && contentValue.length > MAX_FILE_CHARS * 0.9 && !isFileOverLimit;

  const handleSaveEdit = () => {
    if (!activeFile || isFileOverLimit) return;
    onUpdateFile({
      ...activeFile,
      name: fileName.trim() || activeFile.name,
      content: contentValue,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (!activeFile?.content) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNewFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    onCreateFile(newFileName.trim(), '');
    setNewFileName('');
    setIsCreatingNew(false);
  };

  const isMarkdown = activeFile?.name.endsWith('.md') || activeFile?.language === 'markdown';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 h-dvh z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-scrim backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-surface-raised border-l border-edge-raised shadow-2xl h-full flex flex-col z-10"
        >
          {/* Top Bar / Navigation */}
          <div className="h-14 px-3 sm:px-6 border-b border-edge-raised flex items-center justify-between bg-surface-base/40 shrink-0 gap-4">
            {/* File Switcher Dropdown & Add Button */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              {files.length > 0 ? (
                <select
                  value={activeFile?.id || ''}
                  onChange={(e) => onSelectFile(e.target.value)}
                  className="bg-surface-elevated text-xs font-semibold text-text-bright border border-edge-raised rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-edge-hover max-w-[220px] truncate cursor-pointer"
                >
                  {files.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-text-muted">No Files</span>
              )}

              <button
                onClick={() => {
                  if (files.length >= MAX_FILES_PER_WORKSPACE) return;
                  setIsCreatingNew(prev => !prev);
                }}
                disabled={files.length >= MAX_FILES_PER_WORKSPACE}
                className={`p-1.5 rounded-lg transition-colors ${
                  files.length >= MAX_FILES_PER_WORKSPACE
                    ? 'text-text-muted opacity-40 cursor-not-allowed'
                    : 'text-text-muted hover:text-primary hover:bg-surface-elevated cursor-pointer'
                }`}
                title={
                  files.length >= MAX_FILES_PER_WORKSPACE
                    ? `Maximum ${MAX_FILES_PER_WORKSPACE} files per workspace reached.`
                    : 'Create new file'
                }
              >
                <Plus className="w-4 h-4" />
              </button>

              <span className="text-[10px] font-semibold text-text-muted px-1.5 py-0.5 rounded bg-surface-elevated border border-edge-raised">
                {files.length}/{MAX_FILES_PER_WORKSPACE} files
              </span>
            </div>

            {/* Top Right: Delete Icon & Close Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeFile && (
                <button
                  onClick={() => onDeleteFile(activeFile.id)}
                  className="p-1.5 text-text-muted hover:text-danger hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="w-px h-4 bg-edge-raised" />

              <button
                onClick={onClose}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* New File Inline Form */}
          {isCreatingNew && (
            <form onSubmit={handleCreateNewFileSubmit} className="p-3 bg-surface-elevated border-b border-edge-raised flex items-center gap-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.md or note.txt"
                className="flex-1 bg-surface-base border border-edge-raised rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="submit"
                className="text-xs font-medium bg-primary hover:bg-primary-hover text-surface px-3 py-1.5 rounded-lg transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-text-muted hover:text-text-primary px-2 py-1.5"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeFile ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-edge-raised/80 rounded-2xl p-8 text-center bg-surface-base/20">
                <FileText className="w-10 h-10 text-text-faint mb-3" />
                <h4 className="text-text-secondary font-semibold text-sm">Workspace Drawer Empty</h4>
                <p className="text-xs text-text-muted max-w-sm mt-1 mb-4">
                  Create a file or ask the AI to generate documents for your workspace.
                </p>
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-surface text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-button"
                >
                  <Plus className="w-4 h-4" /> Create New File
                </button>
              </div>
            ) : isEditing ? (
              <div key={activeFile?.id || 'none'} className="flex flex-col h-full space-y-3">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="File name (e.g. document.md)"
                  className="bg-surface-base border border-edge-raised rounded-lg px-3 py-2 text-xs font-semibold text-text-bright focus:outline-none focus:border-primary"
                />
                <textarea
                  value={contentValue}
                  onChange={(e) => setContentValue(e.target.value)}
                  maxLength={MAX_FILE_CHARS}
                  rows={26}
                  placeholder="Type your markdown or text content here..."
                  className="w-full flex-1 min-h-[450px] bg-surface-base border border-edge-raised rounded-xl p-4 text-xs text-text-primary font-mono focus:outline-none focus:border-primary/60 leading-relaxed resize-y"
                />
              </div>
            ) : !activeFile.content ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-edge-raised/80 rounded-2xl p-8 text-center bg-surface-base/20">
                <Code className="w-10 h-10 text-text-faint mb-3" />
                <h4 className="text-text-secondary font-semibold text-sm">{activeFile.name} is Empty</h4>
                <p className="text-xs text-text-muted max-w-sm mt-1 mb-4">
                  Click Edit to add content or prompt the AI assistant.
                </p>
                <button
                  onClick={handleStartEditing}
                  className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 bg-primary-soft hover:bg-primary-soft-strong px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit File
                </button>
              </div>
            ) : isMarkdown ? (
              <article className="prose max-w-none space-y-4 text-xs leading-relaxed text-text-primary selection:bg-secondary/50">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-display font-bold text-text-bright tracking-tight border-b border-edge-raised pb-2 mb-3">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-sm font-bold text-primary/90 tracking-wider uppercase border-b border-edge-raised/60 pb-1 mt-6 mb-2">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xs font-semibold text-text-primary mt-3 mb-1 flex items-center justify-between">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-xs text-text-secondary leading-normal my-1">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside pl-4 space-y-1.5 my-2 text-xs text-text-secondary">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-xs text-text-secondary leading-normal">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-text-bright">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-text-muted not-italic text-[11px]">
                          {children}
                        </em>
                      ),
                      hr: () => <hr className="border-edge-raised my-4" />,
                    }}
                  >
                    {activeFile.content}
                  </ReactMarkdown>
                </article>
            ) : (
              <div className="font-mono text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                {activeFile.content}
              </div>
            )}
          </div>

          {/* Footer Bar */}
          {activeFile && (
            <div className="h-16 px-4 sm:px-6 border-t border-edge-raised flex items-center justify-between bg-surface-base/60 backdrop-blur-md shrink-0 gap-3">
              {/* Left Side: Metadata & Character Counter */}
              <div className="flex items-center gap-2 min-w-0">
                {isEditing ? (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      isFileOverLimit
                        ? 'text-danger bg-danger-soft/30 border-danger/40 font-semibold'
                        : isFileWarning
                        ? 'text-warning bg-warning-soft/20 border-warning/30'
                        : 'text-text-muted bg-surface-elevated border-edge-raised'
                    }`}
                  >
                    {formatCharCount(contentValue.length, MAX_FILE_CHARS)} chars
                  </span>
                ) : (
                  <span className="text-[11px] text-text-muted font-medium truncate">
                    {activeFile.content ? `${activeFile.content.length.toLocaleString()} chars` : 'Empty'}
                    {activeFile.language ? ` · ${activeFile.language}` : ''}
                  </span>
                )}
              </div>

              {/* Right Side: Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {activeFile.content && !isEditing && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary bg-surface-elevated hover:bg-surface-hover border border-edge-raised px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    title="Copy file content"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}

                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isFileOverLimit}
                      className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl transition-colors shrink-0 ${
                        isFileOverLimit
                          ? 'bg-surface-elevated text-text-muted opacity-40 cursor-not-allowed border border-edge-raised'
                          : 'text-surface bg-primary hover:bg-primary-hover cursor-pointer shadow-button'
                      } px-4 py-1.5`}
                      title={
                        isFileOverLimit
                          ? `File content exceeds ${MAX_FILE_CHARS.toLocaleString()} characters`
                          : 'Save changes'
                      }
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditing}
                    className="flex items-center gap-1.5 text-xs font-semibold text-text-bright bg-surface-elevated hover:bg-surface-hover border border-edge-raised hover:border-edge-hover px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    <span>Edit File</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
