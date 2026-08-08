import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Plus, Trash2, X, MoreVertical, Pin, PinOff, Edit3, Check } from 'lucide-react';
import type { Conversation } from '@/lib/db/db';
import type { authClient } from '@/lib/auth-client';
import UserButton from '@/components/auth/user-button';
import ThemeToggle from '@/components/theme-toggle';
import RateLimitRing from '@/components/chat/RateLimitRing';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { StrataIcon } from '@/components/ui/strata-icon';
import { MAX_CONVERSATIONS_PER_USER } from '@/lib/limits';

/** The resolved session shape produced by the auth client. */
type Session = typeof authClient.$Infer.Session;

/** Props for the Sidebar component. */
interface SidebarProps {
  /** The user's conversations, most recently updated first. */
  conversations: Conversation[] | undefined;
  /** Number of conversations the user has. */
  conversationCount: number;
  /** Whether the per-user conversation cap has been reached. */
  isMaxConversationsReached: boolean;
  /** The id of the conversation currently open, used to highlight it. */
  activeConversationId: string;
  /** Whether the mobile drawer is expanded. */
  isOpen?: boolean;
  /** Callback invoked when the drawer should close. */
  onClose?: () => void;
  /** Creates a new conversation and navigates to it. */
  onNewChat: () => void;
  /** Deletes a conversation, navigating away if it was the open one. */
  onDelete: (id: string) => Promise<void>;
  /** Renames a conversation. */
  onRename?: (id: string, newTitle: string) => Promise<void>;
  /** Toggles the pinned state of a conversation. */
  onTogglePin?: (id: string) => Promise<void>;
  /** The signed-in user's session, forwarded to the user button. */
  session: Session;
  /** Whether a sign-out request is in flight, forwarded to the user button. */
  isSigningOut: boolean;
  /** Clears the session, forwarded to the user button. */
  onSignOut: () => Promise<void>;
  /** Whether dark mode is active, forwarded to the theme toggle. */
  isDark: boolean;
  /** Toggles the theme, forwarded to the theme toggle. */
  onToggleTheme: () => void;
  /** Remaining 5-hour/weekly message quota, forwarded to the quota ring. */
  rateLimitData?: {
    remaining5h: number;
    remainingWeek: number;
    retryAfter?: number;
  } | null;
}

/**
 * Application sidebar showing the brand header, new chat creation, and the
 * current user's conversation list. Renders as a fixed rail on desktop and
 * an off-canvas drawer with a scrim backdrop on mobile.
 *
 * @param props - Component props.
 */
export default React.memo(function Sidebar({
  conversations,
  conversationCount,
  isMaxConversationsReached,
  activeConversationId,
  isOpen = false,
  onClose,
  onNewChat,
  onDelete,
  onRename,
  onTogglePin,
  session,
  isSigningOut,
  onSignOut,
  isDark,
  onToggleTheme,
  rateLimitData: rateLimitDataProp,
}: SidebarProps) {
  const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  const rateLimitData = rateLimitDataProp ?? null;
  const isQuotaExhausted = rateLimitData !== null && (rateLimitData.remaining5h <= 0 || rateLimitData.remainingWeek <= 0);

  // Close the 3-dots overflow popover when clicking anywhere outside it.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (e: React.MouseEvent, conv: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenuId(null);
    setChatToDelete(conv);
  };

  const handleStartRename = (conv: Conversation) => {
    setEditingChatId(conv.id);
    setEditingTitle(conv.title || 'Untitled Chat');
    setActiveMenuId(null);
  };

  const handleSaveRename = async (id: string) => {
    if (editingTitle.trim()) {
      await onRename?.(id, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;
    await onDelete(chatToDelete.id);
    setChatToDelete(null);
  };

  const handleNewChat = () => {
    onNewChat();
    onClose?.();
  };

  return (
    <>
      {/* Mobile scrim backdrop that closes the drawer on tap */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-raised border-r border-edge-raised flex flex-col h-dvh shrink-0 select-none shadow-2xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none md:bg-surface-raised/60 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-edge-hover/50 flex items-center justify-between gap-2.5">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow-primary">
            <StrataIcon className="w-4 h-4 text-surface" />
          </div>
          <h1 className="text-label font-display font-bold tracking-tight text-text-bright">Strata AI</h1>
          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-surface-base border border-edge-raised text-text-muted">WORKSPACE</span>
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-edge-hover/50">
        <button
          onClick={handleNewChat}
          disabled={isMaxConversationsReached}
          className={`w-full flex items-center justify-center gap-2 font-semibold px-3 py-2 rounded-xl text-label transition-colors ${
            isMaxConversationsReached
              ? 'bg-surface-elevated text-text-muted opacity-50 cursor-not-allowed border border-edge-raised'
              : 'bg-primary hover:bg-primary-hover text-surface shadow-button cursor-pointer'
          }`}
          title={
            isMaxConversationsReached
              ? `Maximum ${MAX_CONVERSATIONS_PER_USER} conversations reached. Delete a chat to create a new one.`
              : 'Create new conversation'
          }
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 flex items-center justify-between text-micro font-semibold text-text-muted uppercase tracking-wider">
          <span>Conversations</span>
          <span className={isMaxConversationsReached ? 'text-warning font-bold' : ''}>
            {conversationCount} / {MAX_CONVERSATIONS_PER_USER}
          </span>
        </div>
        {(!conversations || conversations.length === 0) ? (
          <div className="px-3 py-4 text-center text-caption text-text-faint">
            No saved chats yet
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversationId === conv.id;
            const isEditingThis = editingChatId === conv.id;

            if (isEditingThis) {
              return (
                <div
                  key={conv.id}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-surface-elevated border border-edge-hover w-full my-0.5"
                >
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveRename(conv.id);
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingChatId(null);
                      }
                    }}
                    className="flex-1 bg-surface-base border border-edge-raised rounded px-2 py-1 text-label text-text-bright focus:outline-none focus:border-primary min-w-0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveRename(conv.id)}
                    className="p-1 text-primary hover:bg-primary-soft rounded transition-colors cursor-pointer"
                    title="Save title"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingChatId(null)}
                    className="p-1 text-text-muted hover:text-text-primary rounded transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-xl text-label transition-colors ${
                  isActive
                    ? 'bg-primary-soft text-text-bright font-medium'
                    : 'text-text-muted hover:bg-surface-hover/50 hover:text-text-primary'
                }`}
              >
                <Link
                  href={`/chat-id/${conv.id}`}
                  onClick={() => onClose?.()}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2.5 truncate"
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-text-faint'}`} />
                  <span className="truncate flex-1">{conv.title || 'Untitled Chat'}</span>
                  {conv.pinned && (
                    <Pin className="w-3 h-3 text-primary shrink-0 opacity-80" />
                  )}
                </Link>

                {/* 3-dots Menu Button */}
                <div className="relative shrink-0 pr-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveMenuId(prev => prev === conv.id ? null : conv.id);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeMenuId === conv.id
                        ? 'text-text-primary bg-surface-elevated'
                        : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                    title="Chat options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Overflow Menu */}
                  {activeMenuId === conv.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 mt-1 w-36 bg-surface-elevated border border-edge-hover rounded-xl shadow-2xl p-1 text-caption z-50 animate-in fade-in zoom-in-95"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTogglePin?.(conv.id);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                      >
                        {conv.pinned ? (
                          <>
                            <PinOff className="w-3.5 h-3.5 text-text-muted" />
                            <span>Unpin</span>
                          </>
                        ) : (
                          <>
                            <Pin className="w-3.5 h-3.5 text-text-muted" />
                            <span>Pin</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleStartRename(conv);
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                        <span>Rename</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(e, conv);
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-danger hover:bg-danger-soft/40 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Auth Footer */}
      <div className="p-3 border-t border-edge-hover/50 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
          <div className="flex-1 min-w-0">
            <RateLimitRing rateLimitData={rateLimitData} isQuotaExhausted={isQuotaExhausted} />
          </div>
        </div>
        <UserButton session={session} isSigningOut={isSigningOut} onSignOut={onSignOut} />
      </div>
      </aside>

      <ConfirmDialog
        isOpen={Boolean(chatToDelete)}
        title="Delete Chat"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong className="text-text-bright font-semibold">{chatToDelete?.title || 'Untitled Chat'}</strong>?
            This will permanently remove the conversation and its messages.
          </>
        }
        confirmLabel="Delete Chat"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setChatToDelete(null)}
      />
    </>
  );
})
