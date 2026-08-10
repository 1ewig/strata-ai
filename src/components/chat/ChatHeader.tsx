'use client';

import React, { useState, useRef } from 'react';
import { Folder, Menu, Plus } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MODELS } from '@/lib/models';
import {
  formatContextWindow,
  formatTokens,
  ConversationTokenMetrics,
} from '@/lib/token-usage';
import TokenUsagePopover from './TokenUsagePopover';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  model?: string;
  tokenUsage?: ConversationTokenMetrics | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
  onNewChat: () => void;
}

/**
 * Sticky chat header with conversation title, active context window indicator badge
 * with separated hover/tap details popover, mobile sidebar toggle, and workspace files drawer button.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  model,
  tokenUsage,
  onOpenDrawer,
  onOpenSidebar,
  onNewChat,
}: ChatHeaderProps) {
  // Context window popover state (desktop click/hover & mobile tap)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const modelOption = React.useMemo(() => {
    return MODELS.find((m) => m.id === model) || MODELS[0];
  }, [model]);

  const { contextWindow } = modelOption;

  // Resolve active context window tokens
  const activeTokens = tokenUsage?.active.totalTokens ?? 0;

  const pct =
    contextWindow > 0
      ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
      : 0;

  const isNearLimit = pct >= 80;

  const togglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  return (
    <header className="h-14 border-b border-edge-default bg-surface-base/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-40 relative">
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

        {/* Conversation title & active context window indicator */}
        <div className="flex flex-col min-w-0">
          <span className="text-label font-semibold text-text-primary truncate max-w-[160px] sm:max-w-md">
            {title || 'Chat Workspace'}
          </span>

          {/* Interactive Context Window Button (Click/hover on desktop, tap on mobile) */}
          <button
            ref={triggerRef}
            type="button"
            onClick={togglePopover}
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-lg hover:bg-surface-hover/80 text-left transition-all cursor-pointer group max-w-[220px] sm:max-w-xs"
            title="Click or tap to view token usage and context window details"
            aria-label="View token usage details"
            aria-expanded={isPopoverOpen}
          >
            <span
              className={`text-micro font-mono truncate leading-none transition-colors ${
                isNearLimit
                  ? 'text-warning font-medium'
                  : 'text-text-muted group-hover:text-text-primary'
              }`}
            >
              Context window: {formatTokens(activeTokens)} / {formatContextWindow(contextWindow)}
            </span>
          </button>
        </div>
      </div>

      {/* Separated Clean Token Usage Popover */}
      <TokenUsagePopover
        modelOption={modelOption}
        tokenUsage={tokenUsage}
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        triggerRef={triggerRef}
      />

      {/* Right Side Buttons */}
      <div className="flex items-center gap-3">
        {/* Mobile New Chat Button (Creates a fresh conversation) */}
        <button
          onClick={onNewChat}
          className="md:hidden flex items-center justify-center p-2 text-primary hover:text-primary-hover bg-primary-soft border border-primary/30 rounded-lg hover:bg-primary-soft-strong transition-all cursor-pointer"
          title="New chat"
          aria-label="New chat"
        >
          <Plus className="w-4 h-4" />
        </button>

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
