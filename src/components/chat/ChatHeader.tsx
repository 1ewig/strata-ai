'use client';

import React from 'react';
import { Folder, Menu } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
}

/**
 * Sticky chat header with the conversation title, mobile sidebar toggle and
 * a workspace files action button that opens the Workspace Drawer.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace".
 * @param files - Workspace files listed in the workspace.
 * @param activeFileId - Id of the currently open file.
 * @param onOpenFile - Optional callback when selecting a file.
 * @param onOpenDrawer - Opens the workspace files drawer.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  onOpenDrawer,
  onOpenSidebar,
}: ChatHeaderProps) {
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

        {/* Conversation title */}
        <span className="text-label font-semibold text-text-secondary truncate max-w-[160px] sm:max-w-md">
          {title || 'Chat Workspace'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Desktop Files Button (Opens Workspace Drawer) */}
        <button
          onClick={onOpenDrawer}
          className="hidden md:flex items-center gap-1.5 text-label text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-soft-strong transition-all font-medium cursor-pointer"
          title="Open Workspace Files Drawer"
        >
          <Folder className="w-3.5 h-3.5" />
          Files ({files.length})
        </button>

        {/* Mobile Files Icon Button (Opens Workspace Drawer) */}
        <button
          onClick={onOpenDrawer}
          className="md:hidden flex items-center justify-center p-2 text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 rounded-lg hover:bg-primary-soft-strong transition-all cursor-pointer"
          title={`Open Workspace Files Drawer (${files.length} files)`}
          aria-label="Open Workspace Files Drawer"
        >
          <Folder className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
});
