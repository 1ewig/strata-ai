'use client';

import React from 'react';
import { Folder, Menu } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import ModelSelectorMenu from './ModelSelectorMenu';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
  model?: string;
  thinkingLevel?: string;
  onModelSelect?: (modelId: string) => void;
  onThinkingLevelChange?: (level: string) => void;
}

/**
 * Sticky chat header with desktop workspace title, mobile sidebar toggle and compact
 * model selector menu, plus a workspace files action button that opens the Workspace Drawer.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace" on desktop.
 * @param files - Workspace files listed in the workspace.
 * @param activeFileId - Id of the currently open file.
 * @param onOpenFile - Optional callback when selecting a file.
 * @param onOpenDrawer - Opens the workspace files drawer.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 * @param model - Currently selected model id.
 * @param thinkingLevel - Currently selected thinking effort level.
 * @param onModelSelect - Called when the user picks a model.
 * @param onThinkingLevelChange - Called when the user changes thinking effort.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  onOpenDrawer,
  onOpenSidebar,
  model,
  thinkingLevel,
  onModelSelect,
  onThinkingLevelChange,
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
