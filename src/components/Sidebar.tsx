'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { db, deleteConversation } from '@/lib/db/db';
import { generateId } from '@/lib/id';
import UserButton from '@/components/auth/user-button';
import ThemeToggle from '@/components/theme-toggle';
import { StrataIcon } from '@/components/ui/strata-icon';
import { MAX_CONVERSATIONS_PER_USER } from '@/lib/limits';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const conversations = useLiveQuery(
    () => db.conversations.orderBy('updatedAt').reverse().toArray(),
    []
  );

  const conversationCount = conversations?.length || 0;
  const isMaxConversationsReached = conversationCount >= MAX_CONVERSATIONS_PER_USER;

  const handleNewChat = () => {
    if (isMaxConversationsReached) return;
    const newId = generateId();
    router.push(`/chat-id/${newId}`);
    onClose?.();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation(id);
    if (pathname === `/chat-id/${id}`) {
      const remaining = await db.conversations.orderBy('updatedAt').reverse().toArray();
      if (remaining.length > 0) {
        router.push(`/chat-id/${remaining[0].id}`);
      } else {
        const newId = generateId();
        router.push(`/chat-id/${newId}`);
      }
    }
    onClose?.();
  };

  return (
    <>
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
          <h1 className="text-sm font-display font-bold tracking-tight text-text-bright">Strata AI</h1>
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
          className={`w-full flex items-center justify-center gap-2 font-semibold px-3 py-2 rounded-xl text-xs transition-colors ${
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
        <div className="px-2 py-1 flex items-center justify-between text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          <span>Conversations</span>
          <span className={isMaxConversationsReached ? 'text-warning font-bold' : ''}>
            {conversationCount} / {MAX_CONVERSATIONS_PER_USER}
          </span>
        </div>
        {(!conversations || conversations.length === 0) ? (
          <div className="px-3 py-4 text-center text-xs text-text-faint">
            No saved chats yet
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = pathname === `/chat-id/${conv.id}`;
            return (
              <div
                key={conv.id}
                className={`group relative flex items-center rounded-xl text-xs transition-colors ${
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
                </Link>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 hover:text-danger text-text-muted rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* User Auth Footer */}
      <div className="p-3 border-t border-edge-hover/50 space-y-2">
        <ThemeToggle />
        <UserButton />
      </div>
      </aside>
    </>
  );
}
