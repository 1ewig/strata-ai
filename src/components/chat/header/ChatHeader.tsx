'use client';

import React from 'react';
import { WorkspaceFile } from '@/lib/schemas';
import { ConversationTokenMetrics } from '@/lib/token-usage';
import HeaderSidebarToggles from './HeaderSidebarToggles';
import ContextWindowIndicator from './ContextWindowIndicator';
import NewChatButton from './NewChatButton';
import FilesButton from './FilesButton';

/** Props for the ChatHeader component. */
export interface ChatHeaderProps {
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
  return (
    <header className="h-14 border-b border-edge-default bg-surface-base/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-40 relative">
      <div className="flex items-center gap-2 min-w-0">
        <HeaderSidebarToggles />
        <ContextWindowIndicator title={title} model={model} tokenUsage={tokenUsage} />
      </div>

      {/* Right Side Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <NewChatButton onNewChat={onNewChat} isNewChat={isNewChat} />

        {/* Workspace Files Drawer Button (Visible on all viewports) */}
        {onOpenDrawer && <FilesButton files={files} onOpenDrawer={onOpenDrawer} />}
      </div>
    </header>
  );
});
