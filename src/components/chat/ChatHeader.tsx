'use client';

import React from 'react';
import { Folder, Menu, Plus } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';
import { MODELS } from '@/lib/models';
import {
  formatContextWindow,
  formatTokens,
  ConversationTokenMetrics,
  CumulativeUsage,
} from '@/lib/token-usage';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  model?: string;
  tokenUsage?: ConversationTokenMetrics | CumulativeUsage | null;
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
  onNewChat: () => void;
}

/**
 * Sticky chat header with the conversation title, active context window indicator
 * (Claude Code / OpenCode / Codex standard), mobile sidebar toggle, and workspace files drawer button.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace".
 * @param files - Workspace files listed in the workspace.
 * @param activeFileId - Id of the currently open file.
 * @param model - Active catalog model id.
 * @param tokenUsage - Active context and session token metrics across the conversation.
 * @param onOpenFile - Optional callback when selecting a file.
 * @param onOpenDrawer - Opens the workspace files drawer.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 * @param onNewChat - Creates and navigates to a fresh conversation (mobile only).
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
  const modelOption = React.useMemo(() => {
    return MODELS.find((m) => m.id === model) || MODELS[0];
  }, [model]);

  const { contextWindow } = modelOption;

  // Resolve active context window tokens vs lifetime session metrics
  const activeMetrics = tokenUsage && 'active' in tokenUsage ? tokenUsage.active : null;
  const sessionMetrics = tokenUsage && 'session' in tokenUsage ? tokenUsage.session : null;

  const activeTokens = activeMetrics?.totalTokens ?? tokenUsage?.totalTokens ?? 0;
  const inputTokens = activeMetrics?.inputTokens ?? tokenUsage?.inputTokens ?? 0;
  const outputTokens = activeMetrics?.outputTokens ?? tokenUsage?.outputTokens ?? 0;
  const remainingTokens =
    activeMetrics?.remainingTokens ?? Math.max(0, contextWindow - activeTokens);

  const pct =
    contextWindow > 0
      ? Math.min(100, Math.round((activeTokens / contextWindow) * 100))
      : 0;

  const isNearLimit = pct >= 80;

  // Detailed hover tooltip breakdown
  const tooltipText = tokenUsage
    ? [
        `Active Context: ${activeTokens.toLocaleString()} / ${contextWindow.toLocaleString()} tokens (${pct}% used)`,
        `• Prompt Context (Input): ${inputTokens.toLocaleString()} tokens`,
        `• Response Generation (Output): ${outputTokens.toLocaleString()} tokens`,
        `• Remaining Headroom: ${remainingTokens.toLocaleString()} tokens`,
        sessionMetrics && sessionMetrics.turnCount > 1
          ? `• Total Session Output: ${sessionMetrics.totalOutputTokens.toLocaleString()} tokens (${sessionMetrics.turnCount} turns)`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    : `No token usage recorded yet of ${contextWindow.toLocaleString()} context limit`;

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

        {/* Conversation title & active context window indicator */}
        <div className="flex flex-col min-w-0">
          <span className="text-label font-semibold text-text-primary truncate max-w-[160px] sm:max-w-md">
            {title || 'Chat Workspace'}
          </span>
          <span
            className={`text-micro font-mono truncate max-w-[220px] sm:max-w-xs leading-none transition-colors ${
              isNearLimit ? 'text-warning font-medium' : 'text-text-muted'
            }`}
            title={tooltipText}
          >
            {formatTokens(activeTokens)} / {formatContextWindow(contextWindow)} tokens ({pct}%)
          </span>
        </div>
      </div>

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

