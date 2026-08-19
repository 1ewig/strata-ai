'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Copy, Check, Edit3, Trash2 } from 'lucide-react';
import { WorkspaceFile } from '@/lib/schemas';

interface WorkspaceOverflowMenuProps {
  activeFile: WorkspaceFile;
  isEditing: boolean;
  copied: boolean;
  onCopy: () => void;
  onStartEditing: () => void;
  onDeleteClick: () => void;
}

/**
 * 3-dots overflow menu in the Workspace Drawer header containing
 * Copy Content, Edit File, and Delete File actions.
 */
export default React.memo(function WorkspaceOverflowMenu({
  activeFile,
  isEditing,
  copied,
  onCopy,
  onStartEditing,
  onDeleteClick,
}: WorkspaceOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (isEditing) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="File options"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`p-1.5 text-text-muted hover:text-text-primary active:scale-95 rounded-lg border transition-all duration-150 cursor-pointer ${isOpen
            ? 'bg-surface-elevated text-text-primary border-edge-hover shadow-button'
            : 'hover:bg-surface-elevated border-transparent hover:border-edge-raised'
          }`}
        title="File options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[160px] p-1 rounded-xl bg-surface-elevated/95 backdrop-blur-md border border-edge-raised shadow-card-lg flex flex-col gap-0.5 animate-fade-in"
        >
          {/* Copy Content */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            disabled={!activeFile.content}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-caption font-medium transition-colors text-left cursor-pointer ${!activeFile.content
                ? 'opacity-40 cursor-not-allowed text-text-muted'
                : copied
                  ? 'bg-accent-olive-soft text-accent-olive'
                  : 'text-text-primary hover:bg-surface-hover hover:text-text-bright'
              }`}
          >
            <div className="flex items-center gap-2">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-accent-olive shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              )}
              <span>{copied ? 'Copied Content!' : 'Copy Content'}</span>
            </div>
          </button>

          {/* Edit File */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onStartEditing();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-caption font-medium text-text-primary hover:bg-surface-hover hover:text-text-bright transition-colors text-left cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Edit File</span>
          </button>

          {/* Delete File */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDeleteClick();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-caption font-medium text-danger hover:bg-danger-soft/30 hover:text-danger transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Delete File</span>
          </button>
        </div>
      )}
    </div>
  );
});