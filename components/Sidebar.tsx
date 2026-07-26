'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { MessageSquare, Plus, Trash2, BrainCircuit } from 'lucide-react';
import { db, deleteConversation } from '@/lib/db/db';
import { generateId } from '@/lib/id';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const conversations = useLiveQuery(
    () => db.conversations.orderBy('updatedAt').reverse().toArray(),
    []
  );

  const handleNewChat = () => {
    const newId = generateId();
    router.push(`/chat-id/${newId}`);
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
  };

  return (
    <aside className="w-64 bg-surface-raised/60 border-r border-edge-raised flex flex-col h-screen sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 border-b border-edge-hover/50 flex items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <BrainCircuit className="w-4 h-4 text-surface-base" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-text-bright">Strata AI</h1>
          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-surface-base border border-edge-raised text-text-muted">WORKSPACE</span>
        </Link>
      </div>

      {/* New Chat Button */}
      <div className="p-3 border-b border-edge-hover/50">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-surface-base font-semibold px-3 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Conversations
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
                className={`group relative flex items-center rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-surface-elevated/90 text-text-bright font-medium'
                    : 'text-text-muted hover:bg-surface-hover/50 hover:text-text-primary'
                }`}
              >
                <Link
                  href={`/chat-id/${conv.id}`}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2.5 truncate"
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-text-faint'}`} />
                  <span className="truncate flex-1">{conv.title || 'Untitled Chat'}</span>
                </Link>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 hover:text-rose-400 text-text-muted rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
