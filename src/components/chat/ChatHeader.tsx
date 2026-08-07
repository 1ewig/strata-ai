'use client';

import React from 'react';
import { Folder, Menu, Plus } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';

/** Props for the ChatHeader component. */
import { MODELS } from '@/lib/models';
import { UIMessage } from 'ai';

/** Props for the ChatHeader component. */
interface ChatHeaderProps {
  title?: string;
  files: WorkspaceFile[];
  activeFileId: string | null;
  model?: string;
  messages?: UIMessage[] | unknown[];
  onOpenFile?: (fileId: string) => void;
  onOpenDrawer: () => void;
  onOpenSidebar?: () => void;
  onNewChat: () => void;
}

/**
 * Sticky chat header with the conversation title, token usage / context window indicator,
 * mobile sidebar toggle, and a workspace files action button that opens the Workspace Drawer.
 *
 * @param title - Optional chat/workspace title; falls back to "Chat Workspace".
 * @param files - Workspace files listed in the workspace.
 * @param activeFileId - Id of the currently open file.
 * @param model - Active catalog model id.
 * @param messages - Active chat session messages for estimating context window usage.
 * @param onOpenFile - Optional callback when selecting a file.
 * @param onOpenDrawer - Opens the workspace files drawer.
 * @param onOpenSidebar - Opens the mobile sidebar; hides the toggle when omitted.
 * @param onNewChat - Creates and navigates to a fresh conversation (mobile only).
 */
export default React.memo(function ChatHeader({
  title,
  files,
  model,
  messages,
  onOpenDrawer,
  onOpenSidebar,
  onNewChat,
}: ChatHeaderProps) {
  const modelOption = React.useMemo(() => {
    return MODELS.find((m) => m.id === model) || MODELS[0];
  }, [model]);

  const { estimatedTokens, contextWindow, percentage, formattedTokens, formattedContextWindow } = React.useMemo(() => {
    let charCount = 0;

    // Sum active workspace file content lengths
    if (files && files.length > 0) {
      for (const f of files) {
        if (f.content) charCount += f.content.length;
      }
    }

    // Sum message content, reasoning, and tool execution payload sizes
    if (messages && messages.length > 0) {
      for (const m of messages as any[]) {
        if (typeof m.content === 'string') {
          charCount += m.content.length;
        }
        if (Array.isArray(m.parts)) {
          for (const p of m.parts) {
            if (p.type === 'text' && typeof p.text === 'string') {
              charCount += p.text.length;
            } else if (p.type === 'reasoning' && typeof p.reasoning === 'string') {
              charCount += p.reasoning.length;
            } else if (p.type === 'tool-invocation' || p.type === 'tool-call') {
              charCount += JSON.stringify(p.toolInvocation || p.toolCall || p).length;
            }
          }
        }
      }
    }

    // Standard LLM token heuristic (~4 chars per token)
    const estTokens = Math.ceil(charCount / 4);
    const maxContext = modelOption.contextWindow;
    const pct = Math.min(100, (estTokens / maxContext) * 100);

    const fmtTokens =
      estTokens < 1000
        ? String(estTokens)
        : estTokens < 1000000
        ? `${(estTokens / 1000).toFixed(1)}k`
        : `${(estTokens / 1000000).toFixed(2)}M`;

    const fmtContext =
      maxContext >= 1000000
        ? `${(maxContext / 1000000).toFixed(1)}M`
        : `${Math.round(maxContext / 1000)}k`;

    return {
      estimatedTokens: estTokens,
      contextWindow: maxContext,
      percentage: pct < 0.1 && estTokens > 0 ? '<0.1' : pct.toFixed(1),
      formattedTokens: fmtTokens,
      formattedContextWindow: fmtContext,
    };
  }, [files, messages, modelOption]);

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

        {/* Conversation title & token usage indicator */}
        <div className="flex flex-col min-w-0">
          <span className="text-label font-semibold text-text-primary truncate max-w-[160px] sm:max-w-md">
            {title || 'Chat Workspace'}
          </span>
          <span
            className="text-micro font-mono text-text-muted truncate max-w-[180px] sm:max-w-xs leading-none"
            title={`Estimated ${estimatedTokens.toLocaleString()} tokens used out of ${contextWindow.toLocaleString()} context limit`}
          >
            {formattedTokens} / {formattedContextWindow} tokens ({percentage}%)
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
