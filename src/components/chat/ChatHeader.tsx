'use client';

import React, { useState, useRef } from 'react';
import { Menu, Plus, Folder, PanelLeftOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { WorkspaceFile } from '@/lib/schemas';
import { MODELS } from '@/lib/models';
import { NEAR_LIMIT_PERCENT } from '@/lib/limits';
import {
  formatContextWindow,
  formatTokens,
  ConversationTokenMetrics,
} from '@/lib/token-usage';
import TokenUsagePopover from './TokenUsagePopover';
import { useChatUI } from '@/contexts/ChatUIContext';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files?: WorkspaceFile[];
  activeFileId?: string | null;
  model?: string;
  thinkingLevel?: string;
  tokenUsage?: ConversationTokenMetrics | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer?: () => void;
  onNewChat: () => void;
  /** Whether the active conversation is already an unstarted/new chat. */
  isNewChat?: boolean;
}

/**
 * Sticky chat header with conversation title, active context window indicator badge
 * with separated hover/tap details popover, workspace files button, mobile sidebar toggle,
 * and mobile new chat button.
 */
export default React.memo(function ChatHeader({
  title,
  files,
  model,
  tokenUsage,
  onOpenDrawer,
  onNewChat,
  isNewChat = false,
}: ChatHeaderProps) {
  const { openSidebar, isSidebarCollapsed, expandSidebar } = useChatUI();
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

  const isNearLimit = pct >= NEAR_LIMIT_PERCENT;

  const togglePopover = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  return (
    <header className="h-14 border-b border-edge-default bg-surface-base/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-40 relative">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={openSidebar}
          className="md:hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          onClick={expandSidebar}
          className={`${isSidebarCollapsed ? 'md:flex' : ''} hidden p-2 -ml-1 text-text-muted hover:text-text-primary hover:bg-surface-hover/60 active:scale-90 rounded-lg transition-all duration-150 cursor-pointer shrink-0`}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>

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
            className="flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 rounded-lg hover:bg-surface-hover/80 active:scale-[0.98] text-left transition-all duration-150 cursor-pointer group max-w-[220px] sm:max-w-xs"
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
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Mobile New Chat Button */}
        <motion.button
          type="button"
          disabled={isNewChat}
          whileHover={isNewChat ? undefined : { scale: 1.05 }}
          whileTap={isNewChat ? undefined : { scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          onClick={onNewChat}
          className={`group md:hidden flex items-center justify-center p-2 rounded-xl border transition-all duration-150 shrink-0 select-none ${
            isNewChat
              ? 'border-edge-raised bg-surface-raised/40 text-text-muted opacity-50 cursor-default shadow-none'
              : 'border-edge-raised hover:border-edge-hover bg-surface-raised/80 hover:bg-surface-hover text-text-primary shadow-button cursor-pointer'
          }`}
          title={isNewChat ? 'Already in a new chat' : 'New chat'}
          aria-label={isNewChat ? 'Already in a new chat' : 'New chat'}
        >
          <Plus
            className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
              !isNewChat ? 'group-hover:text-text-primary group-hover:rotate-90' : ''
            }`}
          />
        </motion.button>

        {/* Workspace Files Drawer Button (Visible on all viewports) */}
        {onOpenDrawer && (
          <button
            id="header-files-btn"
            type="button"
            onClick={onOpenDrawer}
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-edge-raised hover:border-edge-hover bg-surface-raised/80 hover:bg-surface-hover text-text-primary shadow-button transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 select-none group"
            title={`Open Workspace Files Drawer (${files?.length ?? 0} ${files?.length === 1 ? 'file' : 'files'})`}
            aria-label="Open Workspace Files Drawer"
          >
            <Folder className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform duration-150 group-hover:scale-105" />
            <span className="hidden sm:inline text-caption sm:text-label font-semibold text-text-primary">Files</span>
            {(files?.length ?? 0) > 0 && (
              <span className="hidden sm:inline-flex text-micro px-1.5 py-0.5 rounded-md bg-surface-base border border-edge-default text-primary font-medium shrink-0">
                {files?.length}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
});
