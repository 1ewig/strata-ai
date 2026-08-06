'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Folder, FileText, Menu } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import ModelSelectorMenu from './ModelSelectorMenu';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  onOpenFile: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
  model?: string;
  thinkingLevel?: string;
  onModelSelect?: (modelId: string) => void;
  onThinkingLevelChange?: (level: string) => void;
}

/**
 * Sticky chat header with desktop workspace title, mobile sidebar toggle and compact
 * model selector menu, plus a workspace files dropdown for opening or managing files.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace" on desktop.
 * @param files - Workspace files listed in the dropdown.
 * @param activeFileId - Id of the currently open file, highlighted in the list.
 * @param onOpenFile - Called when the user selects a file from the dropdown.
 * @param onOpenDrawer - Opens the workspace files drawer from the manage action.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 * @param model - Currently selected model id.
 * @param thinkingLevel - Currently selected thinking effort level.
 * @param onModelSelect - Called when the user picks a model.
 * @param onThinkingLevelChange - Called when the user changes thinking effort.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  activeFileId,
  onOpenFile,
  onOpenDrawer,
  onOpenSidebar,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
}: ChatHeaderProps) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Close the files dropdown when clicking anywhere outside it.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-14 border-b border-edge-default bg-surface-base/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-40">
      <div className="flex items-center gap-2 min-w-0">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Title visible on desktop view */}
        <span className="hidden md:inline text-label font-semibold text-text-secondary truncate max-w-xs sm:max-w-md">
          {title || 'Chat Workspace'}
        </span>

        {/* Compact ModelSelectorMenu visible on mobile view */}
        {model && onModelSelect && onThinkingLevelChange && (
          <div className="md:hidden flex items-center shrink-0">
            <ModelSelectorMenu
              model={model}
              thinkingLevel={thinkingLevel || ''}
              onModelSelect={onModelSelect}
              onThinkingLevelChange={onThinkingLevelChange}
              dropDirection="down"
              compact
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Files Overflow Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          {/* Desktop Files Button (Full label & badge) */}
          <button
            onClick={() => setFileMenuOpen(prev => !prev)}
            className="hidden md:flex items-center gap-1.5 text-label text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-soft-strong transition-all font-medium cursor-pointer"
            title="Workspace Files"
          >
            <Folder className="w-3.5 h-3.5" />
            Files ({files.length})
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {/* Mobile Files Icon Button (Simple folder icon) */}
          <button
            onClick={() => setFileMenuOpen(prev => !prev)}
            className="md:hidden flex items-center justify-center p-2 text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 rounded-lg hover:bg-primary-soft-strong transition-all cursor-pointer"
            title={`Workspace Files (${files.length})`}
            aria-label="Workspace Files"
          >
            <Folder className="w-4 h-4" />
          </button>

          {fileMenuOpen && (
            <div className="absolute mt-1 right-0 w-64 max-w-[calc(100vw-2rem)] bg-surface-elevated border border-edge-hover rounded-xl shadow-xl overflow-hidden text-caption z-50">
              <div className="px-3 py-2 border-b border-edge-raised font-semibold text-text-muted text-label">
                Workspace Files
              </div>

              <div className="py-1 max-h-56 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="px-3 py-3 text-center text-text-faint text-caption">
                    No files in workspace yet
                  </div>
                ) : (
                  files.map((file) => {
                    const isActive = file.id === activeFileId;
                    return (
                      <button
                        key={file.id}
                        onClick={() => {
                          onOpenFile(file.id);
                          setFileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-hover transition-colors cursor-pointer ${
                          isActive ? 'bg-primary-soft text-primary font-medium' : 'text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                          <span className="truncate">{file.name}</span>
                        </div>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
