'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Folder, FileText, Menu, Plus } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  onOpenFile: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
}

/**
 * Sticky chat header with the workspace title, a mobile sidebar toggle, and a
 * workspace files dropdown for opening or managing files.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace".
 * @param files - Workspace files listed in the dropdown.
 * @param activeFileId - Id of the currently open file, highlighted in the list.
 * @param onOpenFile - Called when the user selects a file from the dropdown.
 * @param onOpenDrawer - Opens the workspace files drawer from the manage action.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  activeFileId,
  onOpenFile,
  onOpenDrawer,
  onOpenSidebar,
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
      <div className="flex items-center gap-2">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <span className="text-label font-semibold text-text-secondary truncate max-w-xs sm:max-w-md">
          {title || 'Chat Workspace'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Files Overflow Dropdown */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setFileMenuOpen(prev => !prev)}
            className="flex items-center gap-1.5 text-label text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-soft-strong transition-all font-medium cursor-pointer"
            title="Workspace Files"
          >
            <Folder className="w-3.5 h-3.5" />
            Files ({files.length})
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
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

              <div className="p-1.5 border-t border-edge-raised bg-surface-base/30">
                <button
                  onClick={() => {
                    setFileMenuOpen(false);
                    onOpenDrawer();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-primary hover:bg-primary-soft font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Manage Workspace Files
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
