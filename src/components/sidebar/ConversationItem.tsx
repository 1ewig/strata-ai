import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, MoreVertical, Pin, PinOff, Edit3, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '@/lib/db/db';

interface ConversationRenameEditorProps {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

/**
 * Inline text editor for renaming a conversation.
 */
function ConversationRenameEditor({
  initialTitle,
  onSave,
  onCancel,
}: ConversationRenameEditorProps) {
  const [title, setTitle] = useState(initialTitle);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-surface-elevated border border-edge-hover w-full my-0.5">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        className="flex-1 bg-surface-base border border-edge-raised rounded px-2 py-1 text-label text-text-bright focus:outline-none focus:border-primary min-w-0"
        autoFocus
      />
      <button
        type="button"
        onClick={handleSave}
        className="p-1 text-primary hover:bg-primary-soft active:scale-90 rounded transition-all duration-150 cursor-pointer"
        title="Save title"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 text-text-muted hover:text-text-primary active:scale-90 rounded transition-all duration-150 cursor-pointer"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ConversationItemProps {
  /** The conversation record. */
  conv: Conversation;
  /** Whether this conversation is currently open and active. */
  isActive: boolean;
  /** Whether this item is near the bottom of the list (flips menu upward). */
  isNearBottom: boolean;
  /** Whether this conversation is currently being renamed inline. */
  isEditing: boolean;
  /** Whether the 3-dots overflow menu is open for this conversation. */
  isMenuOpen: boolean;
  /** Callback when the sidebar drawer should close (on mobile link click). */
  onCloseSidebar?: () => void;
  /** Initiates inline title editing for this conversation. */
  onStartRename: (conv: Conversation) => void;
  /** Saves the edited title for this conversation. */
  onSaveRename: (id: string, newTitle: string) => Promise<void>;
  /** Cancels inline title editing. */
  onCancelRename: () => void;
  /** Toggles the 3-dots overflow menu for this conversation. */
  onToggleMenu: (id: string) => void;
  /** Closes the 3-dots overflow menu. */
  onCloseMenu: () => void;
  /** Toggles the pinned status of this conversation. */
  onTogglePin?: (id: string) => Promise<void>;
  /** Opens the delete confirmation dialog for this conversation. */
  onRequestDelete: (e: React.MouseEvent, conv: Conversation) => void;
  /** Ref attached to the open menu container for click-outside detection. */
  menuContainerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Individual conversation list row with active state styling, inline title rename,
 * and 3-dots actions menu with smart popover positioning.
 */
function ConversationItem({
  conv,
  isActive,
  isNearBottom,
  isEditing,
  isMenuOpen,
  onCloseSidebar,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onToggleMenu,
  onCloseMenu,
  onTogglePin,
  onRequestDelete,
  menuContainerRef,
}: ConversationItemProps) {
  if (isEditing) {
    return (
      <ConversationRenameEditor
        initialTitle={conv.title || 'Untitled Chat'}
        onSave={(newTitle) => onSaveRename(conv.id, newTitle)}
        onCancel={onCancelRename}
      />
    );
  }

  return (
    <div
      style={{ zIndex: isMenuOpen ? 50 : 1 }}
      className={`group relative flex items-center rounded-xl text-label transition-all duration-150 ${
        isActive
          ? 'bg-primary-soft text-text-bright font-medium'
          : 'text-text-muted hover:bg-surface-hover/70 hover:text-text-primary'
      }`}
    >
      <Link
        href={`/chat-id/${conv.id}`}
        onClick={() => onCloseSidebar?.()}
        className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2.5"
      >
        <MessageSquare
          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
            isActive ? 'text-primary' : 'text-text-faint group-hover:text-text-muted'
          }`}
        />
        <span className="truncate flex-1">{conv.title || 'Untitled Chat'}</span>
        {conv.pinned && (
          <Pin className="w-3 h-3 text-primary shrink-0 opacity-80" />
        )}
      </Link>

      {/* 3-dots Menu Button & Dropdown Container */}
      <div
        ref={isMenuOpen ? menuContainerRef : null}
        className="relative shrink-0 pr-1.5"
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleMenu(conv.id);
          }}
          className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer ${
            isMenuOpen
              ? 'text-text-primary bg-surface-elevated opacity-100'
              : 'opacity-100 md:opacity-0 md:group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-surface-elevated'
          }`}
          title="Chat options"
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Overflow Dropdown Popover */}
        {isMenuOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 100 }}
            className={`absolute right-0 ${
              isNearBottom ? 'bottom-full mb-1.5 origin-bottom-right' : 'top-full mt-1.5 origin-top-right'
            } w-36 bg-surface-elevated border border-edge-hover rounded-xl shadow-card-lg p-1 text-caption animate-in fade-in zoom-in-95 duration-100`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin?.(conv.id);
                onCloseMenu();
              }}
              className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-text-primary hover:bg-surface-hover active:scale-[0.98] rounded-lg transition-all duration-150 cursor-pointer"
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
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onStartRename(conv);
              }}
              className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-text-primary hover:bg-surface-hover active:scale-[0.98] rounded-lg transition-all duration-150 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-text-muted" />
              <span>Rename</span>
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => onRequestDelete(e, conv)}
              className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 text-danger hover:bg-danger-soft/50 active:scale-[0.98] rounded-lg transition-all duration-150 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-danger" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ConversationItem);
